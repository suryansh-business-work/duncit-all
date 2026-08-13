import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { issueUploadTicket } from '@modules/platform/upload/uploadTicket';
import { deleteArtifact } from '@modules/platform/upload/buildArtifactStore';
import { signToken } from '@modules/access/user/user.service';
import { getUrlConfigs } from '@config/url-configs';
import type { AuthUser } from '@context';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  AppBuildModel,
  nextBuildNo,
  type AppBuildArtifactKind,
  type AppBuildEnv,
  type AppBuildPlatform,
  type AppBuildStatus,
  type IAppBuild,
  type IAppBuildArtifact,
  type IAppBuildStage,
} from './appBuild.model';
import {
  dispatchWorkflow,
  githubRepoConfig,
  requireGithubRepoConfig,
  workflowRunsUrl,
  WORKFLOW_FILE,
} from './github.gateway';

/** Where CI build artifacts land on ImageKit (release-notify's folder). */
export const APP_BUILDS_FOLDER = '/app-builds';

const CHANNEL_ENV_KEY: Record<AppBuildPlatform, string> = {
  ANDROID: 'SLACK_ANDROID_BUILDS_CHANNEL',
  IOS: 'SLACK_IOS_BUILDS_CHANNEL',
};

const PLATFORM_LABEL: Record<AppBuildPlatform, string> = {
  ANDROID: 'Android',
  IOS: 'iOS',
};

/**
 * The branch each env is built from by default — the same mapping the deploy
 * workflow uses, so a staging build is made from the code that is running on
 * staging rather than from whatever main happens to hold.
 */
const DEFAULT_REF: Record<AppBuildEnv, string> = {
  PRODUCTION: 'main',
  STAGING: 'staging',
};

/** What each platform is able to produce. iOS has exactly one answer. */
const ALLOWED_ARTIFACTS: Record<AppBuildPlatform, AppBuildArtifactKind[]> = {
  ANDROID: ['APK', 'AAB'],
  IOS: ['IPA'],
};

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const optionalStr = (v: string | null | undefined): string => String(v ?? '').trim();
const optionalNum = (v: unknown): number | null => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? null : n;
};

const APP_BUILD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [
    'build_no',
    'version',
    'build_name',
    'commit_sha',
    'branch',
    'commits.subject',
    'triggered_by',
  ],
  // Every column the table renders sortable must be listed here — resolveSort
  // silently ignores anything else, so a gap makes the header arrow lie.
  sortFields: {
    build_name: 'build_name',
    status: 'status',
    version: 'version',
    size_mb: 'size_mb',
    duration_seconds: 'duration_seconds',
    branch: 'branch',
    reported_by: 'reported_by',
    app_env: 'app_env',
    triggered_by: 'triggered_by',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    version: { type: 'string' },
    branch: { type: 'string' },
    app_env: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** APK / AAB / IPA, from the file name. The store never renames anything. */
export function artifactKindOf(name: string): AppBuildArtifactKind {
  const lower = name.toLowerCase();
  if (lower.endsWith('.aab')) return 'AAB';
  if (lower.endsWith('.ipa')) return 'IPA';
  return 'APK';
}

/**
 * Every file a build produced — THE one place that knows a row might predate
 * the artifacts list.
 *
 * Builds used to make a single file, so older rows carry it in the singular
 * artifact_* columns and nothing in `artifacts`. Reading them back as a
 * one-element list here means every caller below (Slack, delete, the portal)
 * only ever handles a list, instead of each growing its own idea of legacy.
 */
function artifactsOf(doc: IAppBuild): IAppBuildArtifact[] {
  if (doc.artifacts?.length) return doc.artifacts;
  if (!doc.build_name && !doc.artifact_url) return [];
  return [
    {
      kind: artifactKindOf(doc.build_name),
      name: doc.build_name,
      url: doc.artifact_url,
      file_id: doc.artifact_file_id,
      size_mb: doc.size_mb,
      error: doc.artifact_error ?? '',
    },
  ];
}

const pub = (doc: IAppBuild) => ({
  id: doc.id,
  build_no: doc.build_no,
  platform: doc.platform,
  status: doc.status,
  version: doc.version,
  artifacts: artifactsOf(doc).map((a) => ({
    kind: a.kind,
    name: a.name,
    url: a.url,
    file_id: a.file_id,
    size_mb: a.size_mb,
    error: a.error ?? '',
  })),
  build_name: doc.build_name,
  artifact_url: doc.artifact_url,
  artifact_file_id: doc.artifact_file_id,
  artifact_error: doc.artifact_error ?? '',
  error_message: doc.error_message ?? '',
  size_mb: doc.size_mb,
  commit_sha: doc.commit_sha,
  branch: doc.branch,
  commits: doc.commits.map((c) => ({ hash: c.hash, subject: c.subject, author: c.author ?? '' })),
  files_changed: doc.files_changed,
  insertions: doc.insertions,
  deletions: doc.deletions,
  workflow_run_id: doc.workflow_run_id,
  workflow_run_url: doc.workflow_run_url,
  duration_seconds: doc.duration_seconds,
  reported_by: doc.reported_by,
  dispatch_id: doc.dispatch_id ?? '',
  trigger_source: doc.trigger_source ?? 'PUSH',
  triggered_by: doc.triggered_by ?? '',
  app_env: doc.app_env ?? 'PRODUCTION',
  requested_artifacts: doc.requested_artifacts ?? [],
  stage: doc.stage ?? '',
  stages: (doc.stages ?? []).map((s) => ({ name: s.name, at: s.at?.toISOString() ?? '' })),
  slack_channel: doc.slack_channel,
  slack_ts: doc.slack_ts,
  slack_error: doc.slack_error,
  created_at: doc.created_at?.toISOString() ?? null,
});

/** Slack mrkdwn treats &, < and > as control characters — a commit subject
 * containing `<!channel>` would otherwise ping the whole channel. */
const escapeMrkdwn = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** GitHub commit link derived from the run URL — both live on the same repo. */
function commitUrl(build: IAppBuild): string {
  const base = build.workflow_run_url.split('/actions/')[0];
  if (!base || !build.commit_sha) return '';
  return `${base}/commit/${build.commit_sha}`;
}

function headline(build: IAppBuild): string {
  const label = PLATFORM_LABEL[build.platform];
  if (build.status === 'FAILED') {
    return `:x: ${label} build failed — v${build.version} (${build.build_no})`;
  }
  return `:package: New ${label} build v${build.version} (${build.build_no})`;
}

const STATUSES = new Set(['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED']);

/** Anything unrecognised means a reporter we do not control — call it SUCCESS,
 * the value this input has defaulted to since the first build. */
const normaliseStatus = (v: unknown): AppBuildStatus =>
  STATUSES.has(String(v)) ? (String(v) as AppBuildStatus) : 'SUCCESS';

/** The facts column: version, branch, size, commit link, diff stat. */
function factLines(build: IAppBuild): string[] {
  const facts: string[] = [
    `*Version:* ${escapeMrkdwn(build.version)}`,
    `*Branch:* ${escapeMrkdwn(build.branch) || '—'}`,
  ];
  // One line covering every file, so an Android build shows its APK next to its
  // AAB rather than quietly naming only the first.
  const sizes = artifactsOf(build)
    .filter((a) => a.size_mb != null)
    .map((a) => `${a.kind} ${(a.size_mb ?? 0).toFixed(1)} MB`);
  if (sizes.length > 0) facts.push(`*Size:* ${sizes.join(' · ')}`);
  if (build.commit_sha) {
    const short = build.commit_sha.slice(0, 7);
    const link = commitUrl(build);
    const commitText = link ? `<${link}|${short}>` : short;
    facts.push(`*Commit:* ${commitText}`);
  }
  if (build.files_changed != null) {
    facts.push(
      `*Changes:* ${build.files_changed} files (+${build.insertions ?? 0} / -${build.deletions ?? 0})`
    );
  }
  return facts;
}

/** The changelog section, or null when the range produced nothing. */
function commitsBlock(build: IAppBuild): unknown {
  if (build.commits.length === 0) return null;
  // Clipped per subject so 8 lines can never breach Slack's 3000-char section
  // limit (which fails the whole post as invalid_blocks).
  const lines = build.commits.slice(0, 8).map((c) => `• ${escapeMrkdwn(clip(c.subject, 150))}`);
  if (build.commits.length > 8) lines.push(`… and ${build.commits.length - 8} more`);
  return { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } };
}

const contextBlock = (text: string) => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] });

/**
 * The one line that explains an unhappy outcome, or null for a plain success.
 *
 * A red headline that does not say what broke sends every reader to the GitHub
 * log to learn a single line, and a green build with no download button looks
 * identical to one nobody wanted — both are worth SAYING.
 */
const missingLine = (a: IAppBuildArtifact): string => {
  const why = a.error ? `: ${clip(a.error, 200)}` : '';
  return `${a.kind}${why}`;
};

function outcomeNote(build: IAppBuild): unknown {
  if (build.status === 'FAILED') {
    if (!build.error_message) return null;
    return contextBlock(`:rotating_light: ${escapeMrkdwn(clip(build.error_message, 500))}`);
  }
  const missing = artifactsOf(build).filter((a) => !a.url);
  if (missing.length === 0) return null;
  const which = escapeMrkdwn(missing.map(missingLine).join(' · '));
  return contextBlock(`:warning: The build succeeded but this was not stored — ${which}`);
}

function actionButtons(build: IAppBuild): unknown[] {
  // One button per file that actually stored. No ?ik-attachment: artifacts are
  // served by our own nginx now, which sends Content-Disposition: attachment
  // for the whole directory.
  const buttons: unknown[] = artifactsOf(build)
    .filter((a) => a.url)
    .map((a) => ({
      type: 'button',
      text: { type: 'plain_text', text: `Download ${a.kind}` },
      style: 'primary',
      url: a.url,
    }));
  if (build.workflow_run_url) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'View run' },
      url: build.workflow_run_url,
    });
  }
  return buttons;
}

/** Block Kit body for the announcement: headline, facts, changes, buttons. */
function buildBlocks(build: IAppBuild): unknown[] {
  const blocks: unknown[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${headline(build)}*` } },
    { type: 'section', fields: factLines(build).map((text) => ({ type: 'mrkdwn', text })) },
  ];
  const commits = commitsBlock(build);
  if (commits) blocks.push(commits);
  const note = outcomeNote(build);
  if (note) blocks.push(note);
  const buttons = actionButtons(build);
  if (buttons.length > 0) blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}

/**
 * Announce an already-SAVED build on the platform's channel. Returns instead
 * of throwing when unconfigured — the build row is already the record, and a
 * missing channel must never turn a reported build into a CI failure.
 */
async function announce(
  build: IAppBuild
): Promise<{ channel?: string | null; ts?: string | null; skipped?: string | null }> {
  const channel = optionalStr(await getRuntimeEnvValue(CHANNEL_ENV_KEY[build.platform]));
  if (!channel) {
    return { skipped: `No Slack channel is configured for ${PLATFORM_LABEL[build.platform]} builds` };
  }
  const result = await postMessage({
    channel,
    text: headline(build).replace(/:[a-z_]+:\s*/g, ''),
    blocks: buildBlocks(build),
  });
  logs.server.info('appBuild', 'announce', {
    channel: result.channel,
    ts: result.ts,
    build_no: build.build_no,
  });
  return { channel: result.channel, ts: result.ts };
}

/** The one default+active SLACK entry, or null. Settings live on its config. */
async function slackEntry() {
  return EnvEntryModel.findOne({ category: 'SLACK', is_active: true, is_default: true });
}

/**
 * The files this report describes.
 *
 * A current reporter sends the list. One talking to us through the singular
 * artifact_* fields — an older reporter, or a new one whose `artifacts` was
 * stripped because it reached a server mid-deploy — still lands its single
 * file, so everything below this line only ever handles a list.
 */
function inputArtifacts(input: any): IAppBuildArtifact[] {
  const sent = Array.isArray(input.artifacts) ? input.artifacts : [];
  const mapped: IAppBuildArtifact[] = sent
    .map((a: any) => ({
      // GraphQL has already checked kind against the enum.
      kind: a.kind as AppBuildArtifactKind,
      name: optionalStr(a.name),
      url: optionalStr(a.url),
      file_id: optionalStr(a.file_id),
      size_mb: optionalNum(a.size_mb),
      error: optionalStr(a.error),
    }))
    .filter((a: IAppBuildArtifact) => a.name);
  if (mapped.length > 0) return mapped;
  const name = optionalStr(input.build_name);
  if (!name) return [];
  return [
    {
      kind: artifactKindOf(name),
      name,
      url: optionalStr(input.artifact_url),
      file_id: optionalStr(input.artifact_file_id),
      size_mb: optionalNum(input.size_mb),
      error: optionalStr(input.artifact_error),
    },
  ];
}

/**
 * The artifacts a trigger may ask for, refusing anything the platform cannot
 * make. Asking Android for an IPA is a caller bug, and silently dropping it
 * would produce a build that quietly ignores half its request.
 */
function requestedArtifacts(platform: AppBuildPlatform, asked: unknown): AppBuildArtifactKind[] {
  const allowed = ALLOWED_ARTIFACTS[platform];
  const list = Array.isArray(asked) ? (asked as AppBuildArtifactKind[]) : [];
  // De-duplicated, and kept in the platform's own order so the primary artifact
  // (the APK, the IPA) is always first however the caller listed them.
  const chosen = allowed.filter((kind) => list.includes(kind));
  const unsupported = list.filter((kind) => !allowed.includes(kind));
  if (unsupported.length > 0) {
    throw badInput(`${PLATFORM_LABEL[platform]} cannot build ${unsupported.join(', ')}`);
  }
  if (chosen.length === 0) throw badInput('Pick at least one artifact to build');
  return chosen;
}

/**
 * The produced-files half of a report, or nothing at all.
 *
 * A progress report says only where the build has got to. Letting it write the
 * empty artifact list it never sent would clear a file the build had already
 * stored, so an absent `artifacts` means "unchanged" rather than "none".
 */
function artifactFields(input: any) {
  if (input.artifacts === undefined && input.build_name === undefined) return {};
  const artifacts = inputArtifacts(input);
  // The FIRST file is the primary one — the APK on Android, the IPA on iOS —
  // whether or not it stored. The singular columns mirror it so every reader
  // written before builds made two files still sees the one that matters.
  const primary = artifacts[0] ?? null;
  return {
    artifacts,
    build_name: primary?.name ?? '',
    artifact_url: primary?.url ?? '',
    artifact_file_id: primary?.file_id ?? '',
    artifact_error: primary?.error ?? '',
    size_mb: primary?.size_mb ?? null,
  };
}

/**
 * The changelog half, on the same "absent means unchanged" rule.
 *
 * The start report establishes what the build is shipping; the seven progress
 * reports that follow carry none of it, and overwriting with their silence
 * would blank the Changes column for the whole build.
 */
function changelogFields(input: any) {
  if (input.commits === undefined) return {};
  return {
    commits: (input.commits ?? [])
      .map((c: any) => ({
        hash: optionalStr(c.hash),
        subject: optionalStr(c.subject),
        author: optionalStr(c.author),
      }))
      .filter((c: any) => c.hash && c.subject),
    files_changed: optionalNum(input.files_changed),
    insertions: optionalNum(input.insertions),
    deletions: optionalNum(input.deletions),
  };
}

/**
 * The row a report belongs to, if one is already open for it.
 *
 * Two join keys, checked in this order because they become available in this
 * order. A portal build has a row BEFORE it has a run — the dispatch answers
 * with no run id — so `dispatch_id` is the only thing that can claim it on the
 * first report. Everything after that (and every push build) joins on the run.
 */
async function openRowFor(input: any, runId: string): Promise<IAppBuild | null> {
  const dispatchId = optionalStr(input.dispatch_id);
  if (dispatchId) {
    const claimed = await AppBuildModel.findOne({ dispatch_id: dispatchId });
    if (claimed) return claimed;
  }
  // A hand-made report has no run id, and every one of those would otherwise
  // look like the same run and overwrite the last.
  if (!runId) return null;
  return AppBuildModel.findOne({ platform: input.platform, workflow_run_id: runId });
}

/**
 * The stage list after this report. A stage is appended only when it CHANGES,
 * so the repeated RUNNING reports a long stage produces do not fill the
 * timeline with the same line over and over.
 */
function nextStages(existing: IAppBuild | null, stage: string): { stages?: IAppBuildStage[] } {
  if (!stage) return {};
  const current = existing?.stages ?? [];
  if (current.at(-1)?.name === stage) return {};
  return { stages: [...current, { name: stage, at: new Date() }] };
}

/**
 * The row this report belongs to: the one this build already opened, or a
 * brand new one.
 *
 * A workflow reports MANY times — QUEUED from the portal, RUNNING at the start
 * and at each stage, then its outcome — and all of them describe one build, so
 * later reports overwrite earlier ones instead of multiplying the table.
 */
async function upsertBuild(
  input: any,
  status: AppBuildStatus,
  version: string,
  reportedBy: string
): Promise<IAppBuild> {
  const runId = optionalStr(input.workflow_run_id);
  const existing = await openRowFor(input, runId);
  const stage = optionalStr(input.stage);
  // The runner is the authority on progress while it is running, and on nothing
  // once it has stopped: a finished build is not "Compiling with Gradle".
  const liveStage = status === 'QUEUED' || status === 'RUNNING' ? stage : '';
  const fields = {
    platform: input.platform,
    status,
    version,
    stage: liveStage,
    ...nextStages(existing, stage),
    // Who asked for this build and what they asked for is known at DISPATCH and
    // nowhere else. A report that does not carry it must not blank it — only a
    // push build, which genuinely has a GitHub actor to name, fills it in here.
    ...(optionalStr(input.triggered_by) && !existing?.triggered_by
      ? { triggered_by: optionalStr(input.triggered_by) }
      : {}),
    ...artifactFields(input),
    ...changelogFields(input),
    // Only a failure carries a reason. Keeping one on a row that later
    // succeeded would leave a green build explaining how it broke.
    error_message: status === 'FAILED' ? optionalStr(input.error_message) : '',
    commit_sha: optionalStr(input.commit_sha),
    branch: optionalStr(input.branch),
    workflow_run_id: runId,
    workflow_run_url: optionalStr(input.workflow_run_url),
    duration_seconds: optionalNum(input.duration_seconds),
    reported_by: reportedBy,
  };
  if (!existing) {
    return AppBuildModel.create({
      build_no: await nextBuildNo(),
      dispatch_id: optionalStr(input.dispatch_id),
      ...fields,
    });
  }
  // created_at deliberately stays at the RUNNING report: for a build, "when"
  // means when it started, not when it happened to finish.
  existing.set(fields);
  await existing.save();
  return existing;
}

export const appBuildService = {
  /** Save the build first, then announce best-effort and record the outcome. */
  async report(input: any, reportedBy: string) {
    const version = optionalStr(input.version);
    if (!version) throw badInput('version is required');
    const status = normaliseStatus(input.status);
    // A SUCCESS build with no artifact used to be refused as a mis-wired
    // reporter. It is a real outcome: the app compiled and only the upload
    // failed, and refusing it meant the most interesting build of the day —
    // "it builds, but you cannot have it" — was the one nobody heard about.
    // The row records it, Slack announces it, and artifact_error says why there
    // is nothing to download.
    const build = await upsertBuild(input, status, version, reportedBy);
    // A build announces itself once: when it is over. The RUNNING report is for
    // the table, which someone is watching — a channel that posted twice per
    // build would be muted inside a week.
    if (status === 'RUNNING') return pub(build);
    try {
      const outcome = await announce(build);
      build.slack_channel = outcome.channel ?? null;
      build.slack_ts = outcome.ts ?? null;
      build.slack_error = outcome.skipped ?? null;
    } catch (err) {
      build.slack_error = err instanceof Error ? err.message : String(err);
      logs.server.error('appBuild', 'announce', { error: err, build_no: build.build_no });
    }
    try {
      // The row (created above) is the record; failing to persist the Slack
      // OUTCOME must not fail the mutation — CI would then re-report this
      // successful build as FAILED.
      await build.save();
    } catch (err) {
      logs.server.error('appBuild', 'saveOutcome', { error: err, build_no: build.build_no });
    }
    return pub(build);
  },

  async table(platform: AppBuildPlatform, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IAppBuild>(
      AppBuildModel,
      { platform },
      input,
      APP_BUILD_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  /**
   * Authorise one artifact upload through the server, which stores it on the
   * VPS and serves it from nginx.
   *
   * Artifacts do NOT go to ImageKit. It refuses anything over 20 MiB — "The file
   * size exceeds 20971520 bytes limit" — which an unsigned IPA slips under and a
   * release APK never will, and that ceiling belongs to the account rather than
   * to any setting we can change. Nothing here needs ImageKit configured any
   * more, so a missing ImageKit no longer blocks a build from being recorded.
   */
  async uploadAuth(userId: string) {
    const { serverUrl } = await getUrlConfigs();
    return {
      upload_url: `${serverUrl.replace(/\/$/, '')}/upload`,
      ticket: issueUploadTicket(userId, APP_BUILDS_FOLDER, 'builds'),
      folder: APP_BUILDS_FOLDER,
    };
  },

  /**
   * Delete a build: the row, and every artifact it points at.
   *
   * The files go first-ish but their absence never blocks the row — an artifact
   * that is already gone (pruned by hand, or never stored because the upload
   * failed) must not leave a row nobody can remove. An Android build owns both
   * its APK and its AAB, and leaving either behind fills the disk with files
   * nothing links to.
   */
  async remove(id: string) {
    const build = await AppBuildModel.findById(id);
    if (!build) throw badInput('That build no longer exists');
    const files = artifactsOf(build)
      .map((a) => a.file_id)
      .filter(Boolean);
    for (const file of files) {
      await deleteArtifact(file);
    }
    await build.deleteOne();
    logs.server.warn('appBuild', 'remove', { build_no: build.build_no, artifacts: files.join(',') });
    return true;
  },

  /** What the Create build dialog needs to know before it can offer anything. */
  async triggerConfig() {
    const [cfg, { serverUrl }] = await Promise.all([githubRepoConfig(), getUrlConfigs()]);
    return {
      configured: cfg !== null,
      repository: cfg ? `${cfg.owner}/${cfg.repo}` : '',
      production_ref: DEFAULT_REF.PRODUCTION,
      staging_ref: DEFAULT_REF.STAGING,
      reports_to: serverUrl.replace(/\/$/, ''),
    };
  },

  /**
   * Start a build from the portal.
   *
   * Order matters and is the opposite of the obvious one: the row is written
   * BEFORE the dispatch and deleted again if GitHub refuses. Dispatching first
   * would leave a run nothing in the table corresponds to — invisible until it
   * reports, with no way for the operator to know their click did anything —
   * and the row is what carries the dispatch_id the run will claim itself by.
   */
  async trigger(input: any, user: AuthUser) {
    const platform: AppBuildPlatform = input.platform;
    const appEnv: AppBuildEnv = input.app_env;
    const artifacts = requestedArtifacts(platform, input.artifacts);
    const ref = optionalStr(input.ref) || DEFAULT_REF[appEnv];
    const cfg = await requireGithubRepoConfig();

    const { serverUrl } = await getUrlConfigs();
    const dispatchId = randomUUID();
    const build = await AppBuildModel.create({
      build_no: await nextBuildNo(),
      platform,
      status: 'QUEUED',
      dispatch_id: dispatchId,
      trigger_source: 'PORTAL',
      triggered_by: user.email ?? user.id,
      app_env: appEnv,
      requested_artifacts: artifacts,
      branch: ref,
      stage: 'Waiting for a runner',
      stages: [{ name: 'Queued', at: new Date() }],
    });

    try {
      // Every input is a STRING: workflow_dispatch has no array or enum type on
      // the wire, so the artifact list travels comma-separated and the workflow
      // splits it. app_env is lowercased to match the workflow's `choice`
      // options exactly — GitHub validates a dispatched choice against that
      // list and rejects anything else, and our enum is uppercase.
      const inputs: Record<string, string> = {
        app_env: appEnv.toLowerCase(),
        dispatch_id: dispatchId,
        report_url: `${serverUrl.replace(/\/$/, '')}/graphql`,
      };
      // Only Android declares an artifacts input, because only Android has a
      // choice to make. The dispatch API refuses any input a workflow does not
      // declare — 422 "Unexpected inputs provided" — so sending it to iOS
      // anyway would fail every iOS build before it started.
      if (platform === 'ANDROID') inputs.artifacts = artifacts.join(',');
      await dispatchWorkflow(cfg, WORKFLOW_FILE[platform], ref, inputs);
    } catch (err) {
      // The build never started, so its row must not survive to look queued
      // forever. Removing it also returns the build_no's slot to nothing —
      // the counter does not rewind, which is intended: ids are never reused.
      await build.deleteOne();
      throw err;
    }

    logs.server.warn('appBuild', 'trigger', {
      build_no: build.build_no,
      platform,
      app_env: appEnv,
      ref,
      artifacts: artifacts.join(','),
      triggered_by: build.triggered_by,
    });
    return { build: pub(build), actions_url: workflowRunsUrl(cfg, WORKFLOW_FILE[platform], ref) };
  },

  async settings() {
    // Whether CI can actually reach us is not knowable from here — the secret
    // lives in GitHub. The last report is the only honest evidence, so the
    // settings page shows that instead of claiming a status it cannot check.
    const latest = await AppBuildModel.findOne({}, { created_at: 1, reported_by: 1 })
      .sort({ created_at: -1 })
      .lean();
    return {
      android_channel: optionalStr(await getRuntimeEnvValue('SLACK_ANDROID_BUILDS_CHANNEL')) || null,
      ios_channel: optionalStr(await getRuntimeEnvValue('SLACK_IOS_BUILDS_CHANNEL')) || null,
      last_reported_at: latest?.created_at?.toISOString() ?? null,
      last_reported_by: optionalStr(latest?.reported_by) || null,
    };
  },

  /**
   * Re-sign the caller's own identity as a credential for the build workflows.
   *
   * Deliberately grants nothing new: the caller already holds a token with these
   * roles, so this is a convenience over hand-crafting one, not an escalation.
   * Nothing is stored — the token is shown once, and a replacement is a click
   * away, so there is no copy of it here to leak.
   */
  async ciToken(user: AuthUser) {
    const token = await signToken({
      id: user.id,
      email: user.email ?? null,
      roles: user.roles,
      assigned_city: user.assigned_city ?? null,
      assigned_zones: user.assigned_zones ?? [],
    });
    // A long-lived copyable credential is worth being able to trace later.
    logs.server.warn('appBuild', 'ciToken', { userId: user.id, email: user.email ?? '' });
    return {
      token,
      secret_name: 'DUNCIT_RELEASE_TOKEN',
      issued_for: user.email ?? user.id,
    };
  },

  /** Writes the channel fields onto the default SLACK env entry (the same
   * place the bot token lives, so the Environment page shows them too). */
  async updateSettings(input: { android_channel?: string | null; ios_channel?: string | null }) {
    const entry = await slackEntry();
    if (!entry) {
      throw badInput(
        'Connect Slack first — add a bot token in Environment Variables → Slack, and mark the entry default.'
      );
    }
    const set: Record<string, string> = {};
    if (input.android_channel !== undefined) {
      set['config.android_builds_channel'] = optionalStr(input.android_channel);
    }
    if (input.ios_channel !== undefined) {
      set['config.ios_builds_channel'] = optionalStr(input.ios_channel);
    }
    if (Object.keys(set).length > 0) {
      await EnvEntryModel.updateOne({ _id: entry._id }, { $set: set });
    }
    return this.settings();
  },
};
