import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { isEmailAddress } from '@utils/email';
import { AppBuildModel, type AppBuildArtifactKind, type AppBuildPlatform } from './appBuild.model';
import { appBuildService } from './appBuild.service';
import { readAscConfig } from './iosSigning.service';
import { playStoreSettings, requirePlayConfig } from './playRelease.service';
import { listAppleReleases } from './storeRelease.apple';
import { listPlayReleases } from './storeRelease.play';
import { adviseIssue } from './storeRelease.advice';
import { notifyIssue } from './storeRelease.notice';
import { APPLE_AWAITING_RELEASE, type StoreReleaseRow } from './storeRelease.rows';
import {
  MAX_REMINDER_HOURS,
  MIN_REMINDER_HOURS,
  STORE_RELEASE_SETTINGS_KEY,
  StoreReleaseIssueModel,
  StoreReleaseSettingsModel,
  type IStoreReleaseIssue,
  type IStoreReleaseSettings,
  type ReleaseIssueKind,
  type ReleaseStore,
} from './storeRelease.model';

/**
 * Tech → App Builds → Releases.
 *
 * The page reads the stores live; this service adds what the stores cannot
 * say. Every rejected App Store version becomes an issue the first time it is
 * seen — by the page or by the scheduler — with OpenAI's advice attached and
 * the notices sent; an approved version waiting for release becomes one too.
 * Google Play's API reports no review outcome, so a Play rejection is logged
 * by hand and goes down the same path. An issue closes itself when the store
 * moves on, or when an operator says so.
 */

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const MAX_ISSUES_ATTACHED = 300;
const HOUR_MS = 3_600_000;
/** Slack channel IDs look like C0123ABCD (public) or G… (private). */
const CHANNEL_ID_RE = /^[A-Z][A-Z\d]{4,}$/;

const PLATFORM_OF: Record<ReleaseStore, AppBuildPlatform> = { APP_STORE: 'IOS', GOOGLE_PLAY: 'ANDROID' };
const ARTIFACT_OF: Record<ReleaseStore, AppBuildArtifactKind> = { APP_STORE: 'IPA', GOOGLE_PLAY: 'AAB' };

/* ------------------------------- settings ------------------------------- */

export async function getStoreReleaseSettings(): Promise<IStoreReleaseSettings> {
  return StoreReleaseSettingsModel.findOneAndUpdate(
    { singleton_key: STORE_RELEASE_SETTINGS_KEY },
    { $setOnInsert: { singleton_key: STORE_RELEASE_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export const pubSettings = (doc: IStoreReleaseSettings) => ({
  notify_enabled: doc.notify_enabled,
  slack_channel: doc.slack_channel,
  mail_to: doc.mail_to,
  reminders_enabled: doc.reminders_enabled,
  reminder_hours: doc.reminder_hours,
  updated_by: doc.updated_by,
  updated_at: doc.updated_at?.toISOString() ?? null,
});

export interface StoreReleaseSettingsInput {
  notify_enabled: boolean;
  slack_channel: string;
  mail_to: string[];
  reminders_enabled: boolean;
  reminder_hours: number;
}

export async function updateStoreReleaseSettings(input: StoreReleaseSettingsInput, by: string) {
  const channel = String(input.slack_channel ?? '').trim();
  if (channel && !CHANNEL_ID_RE.test(channel)) throw badInput('A Slack channel ID looks like C0123ABCD.');
  const mailTo = [...new Set(input.mail_to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!mailTo.every(isEmailAddress)) throw badInput('One of the addresses is not a valid email address.');
  const hours = Number(input.reminder_hours);
  if (!Number.isInteger(hours) || hours < MIN_REMINDER_HOURS || hours > MAX_REMINDER_HOURS) {
    throw badInput(`Reminder hours must be a whole number from ${MIN_REMINDER_HOURS} to ${MAX_REMINDER_HOURS}.`);
  }
  await getStoreReleaseSettings();
  const doc = await StoreReleaseSettingsModel.findOneAndUpdate(
    { singleton_key: STORE_RELEASE_SETTINGS_KEY },
    {
      $set: {
        notify_enabled: Boolean(input.notify_enabled),
        slack_channel: channel,
        mail_to: mailTo,
        reminders_enabled: Boolean(input.reminders_enabled),
        reminder_hours: hours,
        updated_by: by,
      },
    },
    { new: true }
  );
  logs.server.info('appBuild', 'releaseSettings', { by, channel, mail_to: mailTo.length, hours });
  return doc as IStoreReleaseSettings;
}

/* -------------------------------- issues -------------------------------- */

export const pubIssue = (doc: IStoreReleaseIssue) => ({
  id: doc.id,
  store: doc.store,
  kind: doc.kind,
  source: doc.source,
  version: doc.version,
  build_number: doc.build_number,
  state: doc.state,
  review_state: doc.review_state,
  reviewer_message: doc.reviewer_message,
  store_ref: doc.store_ref,
  detected_at: doc.detected_at.toISOString(),
  detected_by: doc.detected_by,
  resolved_at: doc.resolved_at?.toISOString() ?? null,
  resolved_reason: doc.resolved_reason,
  advice: doc.advice.generated_at
    ? {
        summary: doc.advice.summary,
        causes: doc.advice.causes,
        steps: doc.advice.steps,
        next_time: doc.advice.next_time,
        confidence: doc.advice.confidence,
        model: doc.advice.model,
        generated_at: doc.advice.generated_at.toISOString(),
        error: doc.advice.error,
      }
    : null,
  notified_at: doc.notified_at?.toISOString() ?? null,
  notify_error: doc.notify_error,
  reminder_count: doc.reminder_count,
  last_reminded_at: doc.last_reminded_at?.toISOString() ?? null,
  resubmitted_build_no: doc.resubmitted_build_no,
  resubmitted_by: doc.resubmitted_by,
  resubmitted_at: doc.resubmitted_at?.toISOString() ?? null,
});

const dedupeKey = (store: ReleaseStore, kind: ReleaseIssueKind, row: Pick<StoreReleaseRow, 'version' | 'build_number' | 'state'>) =>
  `${store}:${kind}:${row.version}:${row.build_number}:${row.state}`;

/** Advice, then the notices — in that order, so the mail carries the suggestion. */
async function announceIssue(issue: IStoreReleaseIssue, userId?: string): Promise<void> {
  issue.advice = await adviseIssue(issue, userId);
  await issue.save();
  const settings = await getStoreReleaseSettings();
  if (!settings.notify_enabled) return;
  await notifyIssue(issue, settings, 'NEW');
}

/** Fire-and-forget: the page must not wait on OpenAI and the mail provider. */
const announceLater = (issue: IStoreReleaseIssue) => {
  announceIssue(issue).catch((err) => {
    logs.server.error('appBuild', 'releaseIssueAnnounce', { error: err, issue: issue.id });
  });
};

/** The open issue for this exact store state, or a new one that is then announced. */
async function ensureStoreIssue(row: StoreReleaseRow, kind: ReleaseIssueKind): Promise<void> {
  const key = dedupeKey(row.store, kind, row);
  const open = await StoreReleaseIssueModel.exists({ dedupe_key: key, resolved_at: null });
  if (open) return;
  const issue = await StoreReleaseIssueModel.create({
    store: row.store,
    kind,
    source: 'STORE',
    version: row.version,
    build_number: row.build_number,
    state: row.state,
    review_state: row.review_state,
    store_ref: row.store_ref,
    dedupe_key: key,
    detected_at: new Date(),
  });
  logs.server.warn('appBuild', 'releaseIssue', { store: row.store, kind, version: row.version, state: row.state });
  announceLater(issue);
}

const issueKindOf = (row: StoreReleaseRow): ReleaseIssueKind | null => {
  if (row.status === 'REJECTED') return 'REJECTION';
  if (row.state === APPLE_AWAITING_RELEASE) return 'AWAITING_RELEASE';
  return null;
};

/**
 * Bring the App Store issues in line with what Apple shows now: open one for
 * every rejected or awaiting version that has none, and close every open
 * store-reported issue whose version has moved to another state.
 */
async function syncAppleIssues(rows: StoreReleaseRow[]): Promise<void> {
  const wanted = new Set<string>();
  for (const row of rows) {
    const kind = issueKindOf(row);
    if (!kind) continue;
    wanted.add(dedupeKey(row.store, kind, row));
    await ensureStoreIssue(row, kind);
  }
  const open = await StoreReleaseIssueModel.find({ store: 'APP_STORE', source: 'STORE', resolved_at: null });
  const stateNow = new Map(rows.map((row) => [row.store_ref, row.state]));
  for (const issue of open) {
    if (wanted.has(issue.dedupe_key)) continue;
    const now = stateNow.get(issue.store_ref);
    issue.resolved_at = new Date();
    issue.resolved_reason = now ? `STATE_CHANGED:${now}` : 'VERSION_GONE';
    await issue.save();
  }
}

/* --------------------------------- page --------------------------------- */

export interface StoreReleasePage {
  store: ReleaseStore;
  rows: (StoreReleaseRow & { build_no: string; issue: ReturnType<typeof pubIssue> | null })[];
  fetched_at: string;
  store_url: string;
  app_name: string;
  configured: boolean;
  error: string;
}

const issueKeyOf = (issue: Pick<IStoreReleaseIssue, 'version' | 'build_number'>) => `${issue.version}|${issue.build_number}`;

/** Every issue this store has had, newest first, keyed so a live row finds its own — open ones win. */
async function issuesByRow(store: ReleaseStore): Promise<Map<string, IStoreReleaseIssue>> {
  const issues = await StoreReleaseIssueModel.find({ store }).sort({ detected_at: -1 }).limit(MAX_ISSUES_ATTACHED);
  const map = new Map<string, IStoreReleaseIssue>();
  for (const issue of issues) {
    const key = issueKeyOf(issue);
    const current = map.get(key);
    if (!current || (current.resolved_at && !issue.resolved_at)) map.set(key, issue);
  }
  return map;
}

/** A logged rejection the store no longer lists — still a row, so it is not forgotten. */
const rowOfIssue = (issue: IStoreReleaseIssue): StoreReleaseRow => ({
  id: `${issue.store}:issue:${issue.id}`,
  store: issue.store,
  version: issue.version,
  build_number: issue.build_number,
  state: issue.state,
  status: issue.kind === 'REJECTION' ? 'REJECTED' : 'APPROVED',
  track: '',
  review_state: issue.review_state,
  created_at: issue.detected_at.toISOString(),
  submitted_at: null,
  rollout_pct: null,
  store_ref: issue.store_ref,
});

async function buildNosByNumber(platform: AppBuildPlatform, numbers: string[]): Promise<Map<string, string>> {
  const wanted = numbers.flatMap((n) => n.split(',').map((s) => s.trim())).filter(Boolean);
  if (!wanted.length) return new Map();
  const builds = await AppBuildModel.find({ platform, build_number: { $in: wanted } }, { build_no: 1, build_number: 1 }).lean();
  return new Map(builds.map((b) => [b.build_number, b.build_no]));
}

async function decorate(store: ReleaseStore, rows: StoreReleaseRow[]) {
  const [issues, buildNos] = await Promise.all([
    issuesByRow(store),
    buildNosByNumber(PLATFORM_OF[store], rows.map((r) => r.build_number)),
  ]);
  const seen = new Set<string>();
  const out = rows.map((row) => {
    const key = `${row.version}|${row.build_number}`;
    seen.add(key);
    const issue = issues.get(key);
    const firstNumber = row.build_number.split(',')[0]?.trim() ?? '';
    return { ...row, build_no: buildNos.get(firstNumber) ?? '', issue: issue ? pubIssue(issue) : null };
  });
  for (const [key, issue] of issues) {
    if (seen.has(key) || issue.source !== 'MANUAL') continue;
    out.push({ ...rowOfIssue(issue), build_no: '', issue: pubIssue(issue) });
  }
  return out;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function appStorePage(): Promise<StoreReleasePage> {
  const base = { store: 'APP_STORE' as const, fetched_at: new Date().toISOString() };
  if (!(await readAscConfig())) {
    return { ...base, rows: await decorate('APP_STORE', []), store_url: '', app_name: '', configured: false, error: '' };
  }
  try {
    const apple = await listAppleReleases();
    await syncAppleIssues(apple.rows);
    return { ...base, rows: await decorate('APP_STORE', apple.rows), store_url: apple.url, app_name: apple.appName, configured: true, error: '' };
  } catch (err) {
    logs.server.error('appBuild', 'appStoreReleases', { error: err });
    return { ...base, rows: await decorate('APP_STORE', []), store_url: '', app_name: '', configured: true, error: errorText(err) };
  }
}

async function googlePlayPage(): Promise<StoreReleasePage> {
  const base = { store: 'GOOGLE_PLAY' as const, fetched_at: new Date().toISOString() };
  const play = await playStoreSettings();
  if (!play.configured) {
    return { ...base, rows: await decorate('GOOGLE_PLAY', []), store_url: '', app_name: '', configured: false, error: '' };
  }
  try {
    const releases = await listPlayReleases(await requirePlayConfig());
    return { ...base, rows: await decorate('GOOGLE_PLAY', releases.rows), store_url: releases.url, app_name: play.packageName, configured: true, error: '' };
  } catch (err) {
    logs.server.error('appBuild', 'googlePlayReleases', { error: err });
    return { ...base, rows: await decorate('GOOGLE_PLAY', []), store_url: '', app_name: play.packageName, configured: true, error: errorText(err) };
  }
}

/** The table for one store, read live. A store that cannot be read still answers, with its error. */
export function storeReleases(store: ReleaseStore): Promise<StoreReleasePage> {
  return store === 'APP_STORE' ? appStorePage() : googlePlayPage();
}

/* ------------------------------- operator ------------------------------- */

export interface LogRejectionInput {
  store: ReleaseStore;
  version: string;
  build_number?: string | null;
  reviewer_message: string;
}

/** A rejection the store's API could not report — Google Play's, or one Apple mailed before the sync saw it. */
export async function logRejection(input: LogRejectionInput, user: AuthUser): Promise<IStoreReleaseIssue> {
  const version = String(input.version ?? '').trim();
  const message = String(input.reviewer_message ?? '').trim();
  if (!version) throw badInput('Name the version that was rejected.');
  if (!message) throw badInput('Paste what the reviewer said — the advice is written from it.');
  const by = user.email ?? user.id;
  const issue = await StoreReleaseIssueModel.create({
    store: input.store,
    kind: 'REJECTION',
    source: 'MANUAL',
    version,
    build_number: String(input.build_number ?? '').trim(),
    state: 'MANUAL',
    reviewer_message: message,
    store_ref: version,
    dedupe_key: `${input.store}:MANUAL:${version}:${Date.now()}`,
    detected_at: new Date(),
    detected_by: by,
  });
  await announceIssue(issue, user.id);
  return issue;
}

async function requireIssue(id: string): Promise<IStoreReleaseIssue> {
  const issue = await StoreReleaseIssueModel.findById(id);
  if (!issue) throw badInput('That issue no longer exists.');
  return issue;
}

/** Keep the reviewer's words on the issue and write the advice again with them in hand. */
export async function setReviewerMessage(id: string, message: string, user: AuthUser): Promise<IStoreReleaseIssue> {
  const issue = await requireIssue(id);
  issue.reviewer_message = String(message ?? '').trim();
  issue.advice = await adviseIssue(issue, user.id);
  await issue.save();
  return issue;
}

export async function resolveIssue(id: string, user: AuthUser): Promise<IStoreReleaseIssue> {
  const issue = await requireIssue(id);
  if (!issue.resolved_at) {
    issue.resolved_at = new Date();
    issue.resolved_reason = `BY:${user.email ?? user.id}`;
    await issue.save();
  }
  return issue;
}

/**
 * Push the newest production build with a stored artifact to the store's
 * review track — the existing push, found from here so a rejection is one
 * click from its retry. Open issues for the store remember which build went.
 */
export async function submitLatestBuild(store: ReleaseStore, user: AuthUser) {
  const platform = PLATFORM_OF[store];
  const build = await AppBuildModel.findOne({
    platform,
    status: 'SUCCESS',
    app_env: 'PRODUCTION',
    artifacts: { $elemMatch: { kind: ARTIFACT_OF[store], file_id: { $ne: '' } } },
  })
    .sort({ created_at: -1 })
    .lean();
  if (!build) throw badInput(`There is no successful production ${platform} build with a stored ${ARTIFACT_OF[store]} to submit.`);
  const pushed =
    store === 'APP_STORE'
      ? await appBuildService.pushToAppStore(String(build._id), 'APP_STORE', user)
      : await appBuildService.pushToPlayStore(String(build._id), 'PRODUCTION', user);
  await StoreReleaseIssueModel.updateMany(
    { store, resolved_at: null },
    { $set: { resubmitted_build_no: build.build_no, resubmitted_by: user.email ?? user.id, resubmitted_at: new Date() } }
  );
  return pushed;
}

/* ------------------------------- scheduler ------------------------------ */

/** Open issues nobody has been reminded about within the configured window. */
async function sendDueReminders(): Promise<void> {
  const settings = await getStoreReleaseSettings();
  if (!settings.reminders_enabled || !settings.notify_enabled) return;
  const cutoff = new Date(Date.now() - settings.reminder_hours * HOUR_MS);
  const open = await StoreReleaseIssueModel.find({ resolved_at: null });
  for (const issue of open) {
    const lastTold = issue.last_reminded_at ?? issue.notified_at ?? issue.detected_at;
    if (lastTold > cutoff) continue;
    await notifyIssue(issue, settings, 'REMINDER');
  }
}

/** The scheduler's tick: read Apple if it is connected, sync the issues, then remind. */
export async function pollStoreReleases(): Promise<void> {
  if (await readAscConfig()) {
    try {
      const apple = await listAppleReleases();
      await syncAppleIssues(apple.rows);
    } catch (err) {
      logs.server.error('appBuild', 'releasePoll', { error: err });
    }
  }
  await sendDueReminders();
}
