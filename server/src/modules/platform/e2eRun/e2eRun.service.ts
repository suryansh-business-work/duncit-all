import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import {
  authStatus,
  completeFileUpload,
  deleteFile,
  ensureChannelMember,
  getFileUploadUrl,
  isSlackConfigured,
  postMessage,
  SLACK_FILES_PER_MESSAGE,
} from '@modules/platform/slack/slack.gateway';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { clip, contextBlock, escapeMrkdwn } from '@utils/slack-blocks';
import type { AuthUser } from '@context';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { isDue, nextRunAt, parseTimeOfDay, type CronSchedule } from '@utils/cron-schedule';
import {
  dispatchWorkflow,
  githubRepoConfig,
  requireGithubRepoConfig,
  workflowRunsUrl,
} from '@utils/github-actions';
import {
  E2E_SETTINGS_KEY,
  E2eRunModel,
  E2eRunSettingsModel,
  nextRunNo,
  type E2eRunStatus,
  type E2eRunTrigger,
  type IE2eRun,
  type IE2eRunSettings,
  type IE2eRunStage,
  type IE2eScenarioVideo,
  type IE2eSuiteResult,
} from './e2eRun.model';
import { E2E_SUITES, normaliseSuites, suitesInput } from './e2eRun.suites';
import { buildIdentity, type E2eIdentity } from './e2eRun.identity';
import { forgetMuteCache } from './e2eRun.mute';

/** The one workflow this module drives. */
const WORKFLOW_FILE = 'e2e.yml';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const str = (v: string | null | undefined): string => String(v ?? '').trim();
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const E2E_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['run_no', 'ref', 'commit_sha', 'triggered_by', 'signup_email', 'error_message'],
  // Every column the table renders sortable must be listed here — resolveSort
  // silently ignores anything else, so a gap makes the header arrow lie.
  sortFields: {
    run_no: 'run_no',
    status: 'status',
    trigger_source: 'trigger_source',
    triggered_by: 'triggered_by',
    ref: 'ref',
    duration_seconds: 'duration_seconds',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    trigger_source: { type: 'enum' },
    ref: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const pubSuite = (r: IE2eSuiteResult) => ({
  key: r.key,
  status: r.status,
  specs: r.specs,
  tests: r.tests,
  passed: r.passed,
  failed: r.failed,
  skipped: r.skipped,
  duration_seconds: r.duration_seconds,
  error: r.error ?? '',
  job_url: r.job_url ?? '',
  video_file_id: r.video_file_id ?? '',
  video_permalink: r.video_permalink ?? '',
  video_seconds: r.video_seconds ?? null,
  video_bytes: r.video_bytes ?? null,
  reported_at: r.reported_at?.toISOString() ?? null,
});

const pubScenario = (v: IE2eScenarioVideo) => ({
  suite: v.suite,
  spec: v.spec ?? '',
  title: v.title,
  state: v.state ?? '',
  file_id: v.file_id,
  permalink: v.permalink ?? '',
  seconds: v.seconds ?? null,
  bytes: v.bytes ?? null,
});

const pub = (doc: IE2eRun) => ({
  id: String(doc._id),
  run_no: doc.run_no,
  status: doc.status,
  trigger_source: doc.trigger_source,
  triggered_by: doc.triggered_by ?? '',
  ref: doc.ref ?? '',
  commit_sha: doc.commit_sha ?? '',
  requested_suites: doc.requested_suites ?? [],
  results: (doc.results ?? []).map(pubSuite),
  scenario_videos: (doc.scenario_videos ?? []).map(pubScenario),
  // A row written before totals existed, or one whose legs have not reported
  // yet, still has to answer with the whole shape — every field is non-null.
  totals: {
    suites: doc.totals?.suites ?? 0,
    suites_passed: doc.totals?.suites_passed ?? 0,
    suites_failed: doc.totals?.suites_failed ?? 0,
    suites_skipped: doc.totals?.suites_skipped ?? 0,
    tests: doc.totals?.tests ?? 0,
    passed: doc.totals?.passed ?? 0,
    failed: doc.totals?.failed ?? 0,
    skipped: doc.totals?.skipped ?? 0,
  },
  workflow_run_id: doc.workflow_run_id ?? '',
  workflow_run_url: doc.workflow_run_url ?? '',
  dispatch_id: doc.dispatch_id ?? '',
  duration_seconds: doc.duration_seconds,
  stage: doc.stage ?? '',
  stages: (doc.stages ?? []).map((s) => ({ name: s.name, at: s.at.toISOString() })),
  error_message: doc.error_message ?? '',
  reported_by: doc.reported_by ?? '',
  identity_stamp: doc.identity_stamp ?? '',
  login_email: doc.login_email ?? '',
  signup_email: doc.signup_email ?? '',
  identity_phone: doc.identity_phone ?? '',
  slack_channel: doc.slack_channel ?? null,
  slack_ts: doc.slack_ts ?? null,
  slack_error: doc.slack_error ?? null,
  video_error: doc.video_error ?? null,
  created_at: doc.created_at?.toISOString() ?? null,
});

/** The settings singleton, created with defaults on first read. */
async function settingsDoc(): Promise<IE2eRunSettings> {
  return E2eRunSettingsModel.findOneAndUpdate(
    { key: E2E_SETTINGS_KEY },
    { $setOnInsert: { key: E2E_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec() as Promise<IE2eRunSettings>;
}

const scheduleOf = (doc: IE2eRunSettings): CronSchedule => ({
  enabled: doc.enabled,
  frequency: doc.frequency,
  time_of_day: doc.time_of_day,
  weekday: doc.weekday,
});

/** The run's arithmetic, recomputed from scratch whenever a leg reports. */
function totalsOf(results: IE2eSuiteResult[]) {
  const sum = (pick: (r: IE2eSuiteResult) => number | null) =>
    results.reduce((acc, r) => acc + (pick(r) ?? 0), 0);
  const count = (status: string) => results.filter((r) => r.status === status).length;
  return {
    suites: results.length,
    suites_passed: count('PASSED'),
    suites_failed: count('FAILED'),
    suites_skipped: count('SKIPPED'),
    tests: sum((r) => r.tests),
    passed: sum((r) => r.passed),
    failed: sum((r) => r.failed),
    skipped: sum((r) => r.skipped),
  };
}

/**
 * The row this report belongs to.
 *
 * Two join keys, checked in this order because they become available in this
 * order. A dispatched run has a row BEFORE it has a run id — the dispatch
 * answers 204 with nothing in it — so `dispatch_id` is the only thing that can
 * claim it on the first report. Everything after that joins on the run.
 */
async function openRowFor(input: any): Promise<IE2eRun | null> {
  const dispatchId = str(input.dispatch_id);
  if (dispatchId) {
    const claimed = await E2eRunModel.findOne({ dispatch_id: dispatchId });
    if (claimed) return claimed;
  }
  const runId = str(input.workflow_run_id);
  // A hand-made report has no run id, and every one of those would otherwise
  // look like the same run and overwrite the last.
  if (!runId) return null;
  return E2eRunModel.findOne({ workflow_run_id: runId });
}

/**
 * The stage list after this report. A stage is appended only when it CHANGES,
 * so twenty legs all reporting from the same phase do not fill the timeline
 * with the same line over and over.
 */
function nextStages(existing: IE2eRun | null, stage: string): { stages?: IE2eRunStage[] } {
  if (!stage) return {};
  const current = existing?.stages ?? [];
  if (current.at(-1)?.name === stage) return {};
  return { stages: [...current, { name: stage, at: new Date() }] };
}

/**
 * One leg's result, replacing whatever that leg said before.
 *
 * Written with two atomic array operators rather than by rewriting the array
 * in memory. Twenty legs of the matrix report independently and several finish
 * within the same second; a read-modify-write would let the last one to save
 * overwrite the results that landed while it was thinking, and the suite that
 * vanished would be indistinguishable from one that never ran. `$pull` then
 * `$push` touches only this leg's entry, so a concurrent leg's is never lost.
 */
async function applySuiteResult(id: unknown, suite: any): Promise<void> {
  const key = str(suite.key);
  if (!key) throw badInput('A suite result needs a key.');
  // A re-report replaces the row wholesale, so anything written to it by
  // something OTHER than the runner has to be carried across. The recordings
  // are attached at the gate, after every leg has reported, and a leg that
  // reported twice would otherwise take its own video off the row.
  const previous = await E2eRunModel.findOne(
    { _id: id, 'results.key': key },
    { 'results.$': 1 }
  ).lean();
  const kept = previous?.results?.[0];
  const row: IE2eSuiteResult = {
    key,
    status: suite.status,
    specs: num(suite.specs),
    tests: num(suite.tests),
    passed: num(suite.passed),
    failed: num(suite.failed),
    skipped: num(suite.skipped),
    duration_seconds: num(suite.duration_seconds),
    error: str(suite.error),
    job_url: str(suite.job_url),
    video_file_id: str(kept?.video_file_id),
    video_permalink: str(kept?.video_permalink),
    video_seconds: kept?.video_seconds ?? null,
    video_bytes: kept?.video_bytes ?? null,
    reported_at: new Date(),
  };
  await E2eRunModel.updateOne({ _id: id }, { $pull: { results: { key } } });
  await E2eRunModel.updateOne({ _id: id }, { $push: { results: row } });
}

/** The identity for a run, and the fields that record it on the row. */
function identityFields(identity: E2eIdentity | null) {
  if (!identity) return {};
  return {
    identity_stamp: identity.stamp,
    login_email: identity.login_email,
    signup_email: identity.signup_email,
    identity_phone: identity.phone,
  };
}

/* ── announcing a finished run on Slack ───────────────────────────────────── */

/** Where the E2E channel is kept — beside the bot token, on the SLACK entry. */
const CHANNEL_ENV_KEY = 'SLACK_E2E_CHANNEL';

const slackEntry = () =>
  EnvEntryModel.findOne({ category: 'SLACK', is_active: true, is_default: true });

function headline(run: IE2eRun): string {
  const { suites_failed, passed, tests } = run.totals;
  if (run.status === 'FAILED') {
    return `:x: E2E failed — ${suites_failed} of ${run.totals.suites} suites red (${run.run_no})`;
  }
  return `:white_check_mark: E2E passed — ${run.totals.suites} suites, ${passed}/${tests} tests (${run.run_no})`;
}

/** GitHub commit link derived from the run URL — both live on the same repo. */
function commitUrl(run: IE2eRun): string {
  const base = run.workflow_run_url.split('/actions/')[0];
  if (!base || !run.commit_sha) return '';
  return `${base}/commit/${run.commit_sha}`;
}

function factLines(run: IE2eRun): string[] {
  const facts = [
    `*Branch:* ${escapeMrkdwn(run.ref) || '—'}`,
    `*Started by:* ${escapeMrkdwn(run.triggered_by) || '—'}`,
  ];
  if (run.duration_seconds != null) {
    facts.push(`*Took:* ${Math.round(run.duration_seconds / 60)} min`);
  }
  if (run.totals.suites_skipped > 0) {
    facts.push(`*Not run:* ${run.totals.suites_skipped} suites`);
  }
  if (run.commit_sha) {
    const short = run.commit_sha.slice(0, 7);
    const link = commitUrl(run);
    const commitText = link ? `<${link}|${short}>` : short;
    facts.push(`*Commit:* ${commitText}`);
  }
  return facts;
}

/**
 * The red legs, named. This is the whole reason to post at all: a green run
 * needs no reading, and a red one is only useful if the message says WHICH
 * suite went red without anybody opening GitHub.
 */
function failuresBlock(run: IE2eRun): unknown {
  const failed = (run.results ?? []).filter((r) => r.status === 'FAILED');
  if (failed.length === 0) return null;
  // Clipped per line so eight of them can never breach Slack's 3000-character
  // section limit, which fails the whole post as invalid_blocks.
  const lines = failed.slice(0, 8).map((r) => {
    const why = r.error ? ` — ${escapeMrkdwn(clip(r.error, 150))}` : '';
    return `• *${escapeMrkdwn(r.key)}*${why}`;
  });
  if (failed.length > 8) lines.push(`… and ${failed.length - 8} more`);
  return { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } };
}

function actionButtons(run: IE2eRun, techUrl: string): unknown[] {
  const buttons: unknown[] = [];
  if (run.workflow_run_url) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'View run' },
      style: run.status === 'FAILED' ? 'danger' : undefined,
      url: run.workflow_run_url,
    });
  }
  if (techUrl) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Open in Duncit' },
      url: `${techUrl.replace(/\/$/, '')}/e2e/runs`,
    });
  }
  return buttons;
}

function runBlocks(run: IE2eRun, techUrl: string): unknown[] {
  const blocks: unknown[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${headline(run)}*` } },
    { type: 'section', fields: factLines(run).map((text) => ({ type: 'mrkdwn', text })) },
  ];
  const failures = failuresBlock(run);
  if (failures) blocks.push(failures);
  if (run.status === 'FAILED' && run.error_message) {
    blocks.push(contextBlock(`:rotating_light: ${escapeMrkdwn(clip(run.error_message, 500))}`));
  }
  const buttons = actionButtons(run, techUrl);
  if (buttons.length > 0) blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}

/**
 * Announce an already-SAVED run on the configured channel. Returns instead of
 * throwing when unconfigured — the row is already the record, and a missing
 * channel must never turn a reported run into a CI failure.
 */
async function announce(
  run: IE2eRun
): Promise<{ channel?: string | null; ts?: string | null; skipped?: string | null }> {
  const channel = str(await getRuntimeEnvValue(CHANNEL_ENV_KEY));
  if (!channel) {
    return { skipped: 'No Slack channel is configured for e2e results' };
  }
  const { techUrl } = await getUrlConfigs();
  const result = await postMessage({
    channel,
    // The emoji is decoration in the blocks and noise in a notification
    // preview, which is what `text` becomes.
    text: headline(run).replace(/:[a-z_]+:\s*/g, ''),
    blocks: runBlocks(run, techUrl),
  });
  logs.server.info('e2eRun', 'announce', {
    channel: result.channel,
    ts: result.ts,
    run_no: run.run_no,
  });
  return { channel: result.channel, ts: result.ts };
}

/**
 * Save the channel onto the default SLACK env entry.
 *
 * Refuses rather than silently doing nothing when Slack is not connected: the
 * field would appear to save and the value would go nowhere, which is worse
 * than being told the bot token is missing.
 */
async function writeSlackChannel(channel: string): Promise<void> {
  const entry = await slackEntry();
  if (!entry) {
    throw badInput(
      'Connect Slack first — add a bot token in Environment Variables → Slack, and mark the entry default.'
    );
  }
  await EnvEntryModel.updateOne({ _id: entry._id }, { $set: { 'config.e2e_channel': channel } });
}

/**
 * Post a finished run and record what happened to the post.
 *
 * Every failure here is swallowed into `slack_error` on purpose. The row is
 * the store of record and it is already saved; letting an unreachable Slack
 * throw would make CI re-report a finished run as a broken one. `slack_ts` is
 * the guard against a re-reported outcome posting a second time.
 */
async function announceOutcome(run: IE2eRun): Promise<void> {
  if (run.slack_ts) return;
  try {
    const outcome = await announce(run);
    run.slack_channel = outcome.channel ?? null;
    run.slack_ts = outcome.ts ?? null;
    run.slack_error = outcome.skipped ?? null;
  } catch (err) {
    run.slack_error = err instanceof Error ? err.message : String(err);
    logs.server.error('e2eRun', 'announce', { error: err, run_no: run.run_no });
  }
  try {
    await run.save();
  } catch (err) {
    logs.server.error('e2eRun', 'saveOutcome', { error: err, run_no: run.run_no });
  }
}

/* ── the recordings ───────────────────────────────────────────────────────── */

/**
 * `m:ss` — how long the recording runs, in the shape a video player shows.
 * Slack renders the title verbatim, so it has to read like one.
 */
function clockLabel(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  return ` · ${mins}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/**
 * What the file is called in Slack. The suite and its verdict, because a
 * thread of twenty players is unreadable unless each one says which suite it
 * is and whether that suite went red.
 */
function videoTitle(result: IE2eSuiteResult): string {
  return `${result.key} — ${result.status.toLowerCase()}${clockLabel(result.video_seconds)}`;
}

/** A scenario clip's title: which suite, which test, how it ended. */
function scenarioTitle(video: IE2eScenarioVideo): string {
  const state = str(video.state) || 'recorded';
  return `${video.suite} › ${video.title} — ${state}${clockLabel(video.seconds)}`;
}

/** Slice a list into runs of `size`. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Hang every recording under the run's own Slack message.
 *
 * One `files.completeUploadExternal` per ten files, which is Slack's ceiling,
 * and `thread_ts` on all of them: twenty recordings posted to the channel
 * itself would drown the announcement they belong to.
 */
async function shareVideos(run: IE2eRun): Promise<string | null> {
  const pending = (run.results ?? []).filter((r) => str(r.video_file_id));
  if (pending.length === 0) return null;
  if (!run.slack_channel || !run.slack_ts) {
    return 'The run was not announced, so there is no message to hang the recordings under.';
  }
  // The announcement can post without the bot in the channel; the files cannot.
  await ensureChannelMember(run.slack_channel);
  const shared: Array<{ id: string; permalink: string }> = [];
  const batches = chunk(pending, SLACK_FILES_PER_MESSAGE);
  for (const [index, batch] of batches.entries()) {
    const files = await completeFileUpload({
      files: batch.map((r) => ({ id: r.video_file_id, title: videoTitle(r) })),
      channel: run.slack_channel,
      thread_ts: run.slack_ts,
      // Only on the first, or every batch repeats the same sentence.
      initial_comment:
        index === 0 ? `Recordings for ${run.run_no} — every suite, start to end.` : undefined,
    });
    shared.push(...files.map((f) => ({ id: f.id, permalink: f.permalink })));
  }
  // Written with the positional operator rather than by saving the document:
  // `results` is the array every leg reports into, and assigning it here would
  // undo whatever landed while this was talking to Slack.
  for (const file of shared) {
    const row = pending.find((r) => r.video_file_id === file.id);
    if (!row) continue;
    await E2eRunModel.updateOne(
      { _id: run._id, 'results.key': row.key },
      { $set: { 'results.$.video_permalink': file.permalink } }
    );
  }
  await shareScenarioClips(run);
  return null;
}

/**
 * The scenario clips, in the same thread, after the suite videos.
 *
 * Posted separately from the suite recordings so the thread reads in two
 * parts — the suites start to end, then one clip per scenario — and so a
 * suite that produced no clips changes nothing about how its own recording
 * is shared. The order is the order the scenarios ran.
 */
async function shareScenarioClips(run: IE2eRun): Promise<void> {
  const clips = (run.scenario_videos ?? []).filter((v) => str(v.file_id));
  if (clips.length === 0 || !run.slack_channel || !run.slack_ts) return;
  const shared: Array<{ id: string; permalink: string }> = [];
  const batches = chunk(clips, SLACK_FILES_PER_MESSAGE);
  for (const [index, batch] of batches.entries()) {
    const files = await completeFileUpload({
      files: batch.map((v) => ({ id: v.file_id, title: scenarioTitle(v) })),
      channel: run.slack_channel,
      thread_ts: run.slack_ts,
      initial_comment:
        index === 0 ? `Scenarios for ${run.run_no} — one clip per test, in the order they ran.` : undefined,
    });
    shared.push(...files.map((f) => ({ id: f.id, permalink: f.permalink })));
  }
  for (const file of shared) {
    await E2eRunModel.updateOne(
      { _id: run._id, 'scenario_videos.file_id': file.id },
      { $set: { 'scenario_videos.$.permalink': file.permalink } }
    );
  }
}

/**
 * Whether the installed bot token may upload a file at all.
 *
 * `files:write` is granted at INSTALL time and cannot be added from here, so a
 * workspace whose token predates the recordings has everything else about its
 * Slack working and no videos — which, without this, is only discovered the
 * morning after the first sweep. Null when Slack is not connected: the page
 * already says that, and a second way of saying it would read as a third
 * problem.
 */
async function canUploadVideos(slackReady: boolean): Promise<boolean | null> {
  if (!slackReady) return null;
  try {
    const status = await authStatus();
    // A token whose scopes Slack did not report is not evidence of a missing
    // one — say "yes" and let the upload be the thing that finds out.
    if (!status.scopes_known) return true;
    return status.scopes.some((s) => s.scope === 'files:write' && s.granted);
  } catch {
    // A Slack that cannot be reached is a different problem, and the page has
    // other ways of showing it. Claiming the scope is missing would be a lie.
    return null;
  }
}

/**
 * Remove these runs' recordings from Slack.
 *
 * The history's ceiling has to reach into the workspace as well as into this
 * database: a nightly sweep is tens of megabytes of video against a storage
 * quota, and a full quota stops Slack accepting ANY upload, not only these.
 * Best-effort by design — a file that cannot be deleted must never keep the row
 * that points at it alive.
 */
type RecordedRun = { results?: IE2eSuiteResult[]; scenario_videos?: IE2eScenarioVideo[] };

/** The projection that finds a run's Slack files, for the two places that delete rows. */
const VIDEO_FILE_FIELDS = { 'results.video_file_id': 1, 'scenario_videos.file_id': 1 };

async function forgetVideos(runs: RecordedRun[]): Promise<void> {
  const ids = runs
    .flatMap((run) => [
      ...(run.results ?? []).map((r) => str(r.video_file_id)),
      ...(run.scenario_videos ?? []).map((v) => str(v.file_id)),
    ])
    .filter(Boolean);
  for (const id of ids) {
    try {
      await deleteFile(id);
    } catch (err) {
      logs.server.warn('e2eRun', 'forgetVideo', { error: err, file_id: id });
    }
  }
}

/** Everything a scheduled or portal-started dispatch needs to decide. */
interface DispatchOptions {
  suites: string[];
  ref: string;
  trigger_source: E2eRunTrigger;
  triggered_by: string;
}

/**
 * Write the QUEUED row, ask GitHub to run the workflow, and take the row back
 * out again if GitHub refuses.
 *
 * The row comes first because a person pressing a button needs to see that it
 * landed, and the runner needs a `dispatch_id` to claim. It is deleted on a
 * refusal so a run that never existed does not sit in the table forever.
 */
async function dispatchRun(options: DispatchOptions): Promise<IE2eRun> {
  const cfg = await requireGithubRepoConfig();
  const { serverUrl } = await getUrlConfigs();
  const settings = await settingsDoc();
  const identity = buildIdentity(settings, new Date());
  const dispatchId = randomUUID();

  const run = await E2eRunModel.create({
    run_no: await nextRunNo(),
    status: 'QUEUED',
    trigger_source: options.trigger_source,
    triggered_by: options.triggered_by,
    ref: options.ref,
    requested_suites: options.suites,
    dispatch_id: dispatchId,
    stage: 'Waiting for a runner',
    stages: [{ name: 'Queued', at: new Date() }],
    ...identityFields(identity),
  });

  try {
    // Every input is a STRING: workflow_dispatch has no array type on the wire,
    // so the suite list travels comma-separated and the workflow splits it.
    await dispatchWorkflow(cfg, WORKFLOW_FILE, options.ref, {
      suites: suitesInput(options.suites),
      dispatch_id: dispatchId,
      report_url: `${serverUrl.replace(/\/$/, '')}/graphql`,
    });
  } catch (err) {
    await E2eRunModel.deleteOne({ _id: run._id });
    throw err;
  }
  return run;
}

/** Trim the history to the configured ceiling. Never touches a live run. */
async function prune(keepLast: number): Promise<void> {
  if (!Number.isFinite(keepLast) || keepLast <= 0) return;
  const survivors = await E2eRunModel.find({}, { _id: 1 })
    .sort({ created_at: -1 })
    .limit(keepLast)
    .lean();
  const filter = {
    _id: { $nin: survivors.map((s) => s._id) },
    status: { $in: ['SUCCESS', 'FAILED'] },
  };
  // Read the doomed rows BEFORE deleting them: their recordings are held in
  // Slack, and the file ids that free that storage exist nowhere else.
  const doomed = await E2eRunModel.find(filter, VIDEO_FILE_FIELDS).lean();
  await E2eRunModel.deleteMany(filter);
  await forgetVideos(doomed);
}

export const e2eRunService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IE2eRun>(
      E2eRunModel,
      {},
      input,
      E2E_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  suiteCatalogue() {
    return E2E_SUITES.map((suite) => ({ ...suite }));
  },

  async settings() {
    const doc = await settingsDoc();
    const now = new Date();
    const identity = buildIdentity(doc, now);
    // Whether CI can actually reach us is not knowable from here — the secret
    // lives in GitHub. The last report is the only honest evidence, so the page
    // shows that instead of claiming a status it cannot check.
    const latest = await E2eRunModel.findOne(
      { reported_by: { $ne: '' } },
      { created_at: 1, reported_by: 1 }
    )
      .sort({ created_at: -1 })
      .lean();
    const [channel, slackReady] = await Promise.all([
      getRuntimeEnvValue(CHANNEL_ENV_KEY),
      isSlackConfigured(),
    ]);
    return {
      enabled: doc.enabled,
      frequency: doc.frequency,
      time_of_day: doc.time_of_day,
      weekday: doc.weekday,
      ref: doc.ref,
      suites: doc.suites ?? [],
      keep_last: doc.keep_last,
      email_prefix: doc.email_prefix ?? '',
      email_domain: doc.email_domain ?? '',
      password_set: Boolean(str(doc.password)),
      identity_phone: doc.identity_phone ?? '',
      mute_communications: Boolean(doc.mute_communications),
      otp_bypass: Boolean(doc.otp_bypass),
      record_videos: Boolean(doc.record_videos),
      can_upload_videos: await canUploadVideos(slackReady),
      slack_channel: str(channel) || null,
      slack_configured: slackReady,
      login_email_preview: identity?.login_email ?? '',
      signup_email_preview: identity?.signup_email ?? '',
      last_run_at: doc.last_run_at?.toISOString() ?? null,
      next_run_at: nextRunAt(scheduleOf(doc), now)?.toISOString() ?? null,
      last_reported_at: latest?.created_at?.toISOString() ?? null,
      last_reported_by: str(latest?.reported_by) || null,
    };
  },

  async updateSettings(input: any) {
    const previous = await settingsDoc();
    if (!parseTimeOfDay(str(input.time_of_day))) {
      throw badInput('Time of day must be HH:mm, e.g. 03:00.');
    }
    const keepLast = num(input.keep_last) ?? 0;
    if (keepLast < 1) throw badInput('Keep at least one run.');
    const ref = str(input.ref);
    if (!ref) throw badInput('Pick a branch for scheduled runs.');
    const set: Record<string, unknown> = {
      enabled: Boolean(input.enabled),
      frequency: input.frequency,
      time_of_day: str(input.time_of_day),
      weekday: num(input.weekday) ?? 1,
      ref,
      suites: normaliseSuitesOrThrow(input.suites),
      keep_last: keepLast,
      email_prefix: str(input.email_prefix),
      email_domain: str(input.email_domain).replace(/^@/, ''),
      identity_phone: str(input.identity_phone),
      mute_communications: Boolean(input.mute_communications),
      otp_bypass: Boolean(input.otp_bypass),
      record_videos: Boolean(input.record_videos),
    };
    // Absent leaves the saved password alone. The form cannot read it back, so
    // a field that always wrote would blank it every time it was opened.
    if (input.password !== undefined && input.password !== null) {
      set.password = String(input.password);
    }
    // Turning the schedule ON starts the clock from now, rather than letting
    // the catch-up rule fire a sweep the moment it is enabled: `last_run_at` is
    // null on a schedule that has never run, so without this, switching it on
    // at two in the afternoon starts a forty-minute run at two in the
    // afternoon. Every later window still catches up normally.
    if (set.enabled && !previous.enabled) set.last_run_at = new Date();
    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: set }, { upsert: true });
    // The mute is read on the path of every mail and every message, so it is
    // cached — dropping that cache here is what makes switching it take effect
    // as the operator presses Save rather than up to ten seconds afterwards.
    forgetMuteCache();
    // The channel is NOT part of this document. It lives on the SLACK env
    // entry beside the bot token, so every channel the platform posts to is
    // configured in one place and the Environment page can show it.
    if (input.slack_channel !== undefined) await writeSlackChannel(str(input.slack_channel));
    return this.settings();
  },

  async triggerConfig() {
    const [cfg, doc, urls] = await Promise.all([
      githubRepoConfig(),
      settingsDoc(),
      getUrlConfigs(),
    ]);
    return {
      configured: Boolean(cfg),
      repository: cfg ? `${cfg.owner}/${cfg.repo}` : '',
      default_ref: doc.ref,
      reports_to: urls.serverUrl,
    };
  },

  /** Start a run from the portal. */
  async trigger(input: any, user: AuthUser) {
    const doc = await settingsDoc();
    const run = await dispatchRun({
      suites: normaliseSuitesOrThrow(input.suites),
      ref: str(input.ref) || doc.ref,
      trigger_source: 'PORTAL',
      triggered_by: user.email ?? user.id,
    });
    const cfg = await requireGithubRepoConfig();
    return { run: pub(run), actions_url: workflowRunsUrl(cfg, WORKFLOW_FILE, run.ref) };
  },

  /**
   * The workflow claiming its run and collecting the identity to test with.
   *
   * A run started by hand from the Actions tab has no row yet, so this opens
   * one; a dispatched run already has its QUEUED row and this finds it. Either
   * way the answer carries the suites to execute, so the runner never has to
   * work out what "all" meant.
   */
  async start(input: any, reportedBy: string) {
    const existing = await openRowFor(input);
    const settings = await settingsDoc();
    const runId = str(input.workflow_run_id);
    const fields = {
      status: 'RUNNING' as E2eRunStatus,
      workflow_run_id: runId,
      workflow_run_url: str(input.workflow_run_url),
      ref: str(input.ref) || existing?.ref || settings.ref,
      commit_sha: str(input.commit_sha),
      stage: 'Running suites',
      ...nextStages(existing, 'Running suites'),
      reported_by: reportedBy,
    };

    let run: IE2eRun;
    if (existing) {
      existing.set(fields);
      await existing.save();
      run = existing;
    } else {
      const identity = buildIdentity(settings, new Date());
      run = await E2eRunModel.create({
        run_no: await nextRunNo(),
        trigger_source: 'MANUAL',
        triggered_by: str(input.triggered_by),
        requested_suites: normaliseSuitesOrThrow(input.suites),
        dispatch_id: str(input.dispatch_id),
        ...identityFields(identity),
        ...fields,
      });
    }

    // Rebuilt from the ROW, not from the settings: an identity is fixed when
    // the run is created, and reading the settings again here would hand a
    // re-dispatched runner a different address from the one on its own row.
    const credentials = run.signup_email
      ? {
          stamp: run.identity_stamp,
          login_email: run.login_email,
          signup_email: run.signup_email,
          password: settings.password ?? '',
          phone: run.identity_phone,
        }
      : null;
    return { run: pub(run), credentials, suites: run.requested_suites ?? [] };
  },

  /**
   * Progress, one suite's result, or the run's outcome.
   *
   * A workflow reports MANY times — once per matrix leg, then once at the gate
   * — and all of them describe one run, so later reports merge into the same
   * row instead of multiplying the table.
   */
  async report(input: any, reportedBy: string) {
    const found = await openRowFor(input);
    if (!found) {
      throw badInput('No e2e run matches this dispatch or workflow run. Call startE2eRun first.');
    }
    if (input.suite) await applySuiteResult(found._id, input.suite);
    // Re-read AFTER the atomic write, so the totals are summed over every leg
    // that has landed — including the ones that reported while this request was
    // in flight. `results` is deliberately never assigned below: mongoose only
    // sends the paths it sees change, and leaving it alone is what keeps a
    // concurrent leg's row safe.
    const run = (await E2eRunModel.findById(found._id)) ?? found;
    const stage = str(input.stage);
    const status: E2eRunStatus | null = input.status ?? null;
    run.totals = totalsOf(run.results ?? []) as IE2eRun['totals'];

    const stages = nextStages(run, stage);
    if (stages.stages) run.stages = stages.stages;
    if (status) run.status = status;
    // The runner is the authority on progress while it is running, and on
    // nothing once it has stopped: a finished run is not "Running suites".
    const finished = status === 'SUCCESS' || status === 'FAILED';
    run.stage = finished ? '' : stage || run.stage;
    if (finished) {
      run.error_message = status === 'FAILED' ? str(input.error_message) : '';
      run.duration_seconds = num(input.duration_seconds) ?? run.duration_seconds;
    }
    if (str(input.workflow_run_id)) run.workflow_run_id = str(input.workflow_run_id);
    if (str(input.workflow_run_url)) run.workflow_run_url = str(input.workflow_run_url);
    if (str(input.ref)) run.ref = str(input.ref);
    if (str(input.commit_sha)) run.commit_sha = str(input.commit_sha);
    run.reported_by = reportedBy;
    await run.save();
    // A run announces itself ONCE: when it is over. Every leg reports as it
    // lands, and a channel that posted twenty times per sweep would be muted
    // inside a week.
    if (finished) await announceOutcome(run);
    return pub(run);
  },

  /**
   * A place in Slack for one suite's recording, or the reason there is none.
   *
   * Answers rather than throws for every reason a recording cannot be taken —
   * videos switched off, no results channel, a token without `files:write`. CI
   * prints the reason and carries on: a suite that passed must not be recorded
   * as broken because nobody could watch it afterwards.
   */
  async videoUploadAuth(input: any) {
    const refused = (reason: string) => ({ ok: false, upload_url: '', file_id: '', reason });
    const run = await openRowFor(input);
    if (!run) throw badInput('No e2e run matches this dispatch or workflow run.');
    const settings = await settingsDoc();
    if (!settings.record_videos) {
      return refused('Recording is switched off in Tech → E2E Tests → Settings.');
    }
    const channel = str(await getRuntimeEnvValue(CHANNEL_ENV_KEY));
    if (!channel) return refused('No Slack channel is configured for e2e results.');
    const length = num(input.length) ?? 0;
    if (length <= 0) return refused('A recording with no bytes in it cannot be uploaded.');
    try {
      const slot = await getFileUploadUrl(str(input.file_name) || `${str(input.suite)}.mp4`, length);
      return { ok: true, upload_url: slot.upload_url, file_id: slot.file_id, reason: '' };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logs.server.warn('e2eRun', 'videoUploadAuth', { error: err, suite: str(input.suite) });
      return refused(reason);
    }
  },

  /**
   * Share the uploaded recordings under the run's announcement.
   *
   * Called once, by the gate, after the outcome has been reported — that is the
   * only moment a thread to hang them under exists. Every failure is recorded
   * on `video_error` rather than thrown, for the reason the announcement itself
   * is: the run is already decided, and a workspace that would not take a video
   * must not turn a green sweep red.
   */
  async attachVideos(input: any) {
    const run = await openRowFor(input);
    if (!run) throw badInput('No e2e run matches this dispatch or workflow run.');
    const videos: any[] = Array.isArray(input.videos) ? input.videos : [];
    for (const video of videos) {
      const suite = str(video.suite);
      const fileId = str(video.file_id);
      if (!suite || !fileId) continue;
      await E2eRunModel.updateOne(
        { _id: run._id, 'results.key': suite },
        {
          $set: {
            'results.$.video_file_id': fileId,
            'results.$.video_seconds': num(video.seconds),
            'results.$.video_bytes': num(video.bytes),
          },
        }
      );
    }
    // The clips arrive once, from the gate, so the list is replaced rather than
    // merged — there is no second reporter to lose a write to.
    const scenarios: any[] = Array.isArray(input.scenarios) ? input.scenarios : [];
    const clips: IE2eScenarioVideo[] = scenarios
      .filter((v) => str(v.suite) && str(v.title) && str(v.file_id))
      .map((v) => ({
        suite: str(v.suite),
        spec: str(v.spec),
        title: str(v.title),
        state: str(v.state),
        file_id: str(v.file_id),
        permalink: '',
        seconds: num(v.seconds),
        bytes: num(v.bytes),
      }));
    if (clips.length > 0) {
      await E2eRunModel.updateOne({ _id: run._id }, { $set: { scenario_videos: clips } });
    }
    // Re-read so the share works from what is actually stored, including the
    // legs that reported while this request was in flight.
    const fresh = (await E2eRunModel.findById(run._id)) ?? run;
    try {
      fresh.video_error = await shareVideos(fresh);
    } catch (err) {
      fresh.video_error = err instanceof Error ? err.message : String(err);
      logs.server.error('e2eRun', 'shareVideos', { error: err, run_no: fresh.run_no });
    }
    await fresh.save();
    return pub((await E2eRunModel.findById(run._id)) ?? fresh);
  },

  async remove(id: string) {
    // Same order as prune: the recordings can only be found through the row.
    const doomed = await E2eRunModel.findById(id, VIDEO_FILE_FIELDS).lean();
    const res = await E2eRunModel.deleteOne({ _id: id });
    if (res.deletedCount > 0 && doomed) await forgetVideos([doomed]);
    return res.deletedCount > 0;
  },

  /**
   * The nightly run, if one is owed.
   *
   * `last_run_at` is stamped BEFORE the dispatch and whether or not it
   * succeeds: GitHub that cannot be reached now will not be reachable a minute
   * later either, and retrying every tick would bury the one failure worth
   * reading under a thousand more.
   */
  async runIfDue(now: Date = new Date()): Promise<string | null> {
    const doc = await settingsDoc();
    if (!isDue(scheduleOf(doc), doc.last_run_at, now)) return null;
    await E2eRunSettingsModel.updateOne(
      { key: E2E_SETTINGS_KEY },
      { $set: { last_run_at: now } }
    ).exec();
    const run = await dispatchRun({
      suites: doc.suites ?? [],
      ref: doc.ref,
      trigger_source: 'SCHEDULE',
      triggered_by: 'schedule',
    });
    logs.server.info('e2eRun', 'scheduled', { run_no: run.run_no, ref: run.ref });
    await prune(doc.keep_last);
    return run.run_no;
  },
};

/** The catalogue's own validation, re-thrown as a GraphQL user error. */
function normaliseSuitesOrThrow(asked: unknown): string[] {
  try {
    return normaliseSuites(asked);
  } catch (err) {
    throw badInput(err instanceof Error ? err.message : String(err));
  }
}
