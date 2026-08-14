import { createHash, timingSafeEqual } from 'node:crypto';
import { Types, isValidObjectId } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { telemetryRuntime } from '@observability/telemetryRuntime';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  BUG_USER_SAMPLE,
  BugModel,
  TelemetryLogModel,
  TelemetrySettingsModel,
  getTelemetrySettings,
  mintTelemetryApiKey,
  type BugStatus,
  type IBug,
  type ITelemetryClient,
  type ITelemetryLog,
  type ITelemetrySettings,
  type ITelemetryUser,
  type TelemetryLevel,
} from './telemetry.model';
import { resolveLogUser } from './telemetryUser';

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_LEVELS = new Set<TelemetryLevel>(['debug', 'info', 'warn', 'error']);
const VALID_ENVS = new Set(['localhost', 'staging', 'production']);
const BUG_STATUSES = new Set<BugStatus>(['OPEN', 'RESOLVED', 'IGNORED']);

/** The structured record the log funnel hands us (server observability LogRecord). */
export interface TelemetryRecordInput {
  app: string;
  portal?: string;
  platform: string;
  os?: string;
  environment: string;
  url?: string;
  host?: string;
  level: TelemetryLevel;
  page: string;
  component: string;
  error?: { name: string; message: string; stack?: string };
  data?: Record<string, unknown>;
  /** Server-resolved identity (verified JWT). Absent when nobody was signed in. */
  user?: { id: string; email?: string; roles?: string[] };
  client?: ITelemetryClient;
  duid?: string;
  session_id?: string;
  ip?: string;
  user_agent?: string;
}

/* ------------------------------- helpers ------------------------------- */

/** Normalized surface key, e.g. mWeb / mobileApp:ios / portal:crm / website:duncit / server. */
function computeSource(r: TelemetryRecordInput): string {
  if (r.app === 'mobileApp') return r.os ? `mobileApp:${r.os}` : 'mobileApp';
  if ((r.app === 'portal' || r.app === 'website') && r.portal) return `${r.app}:${r.portal}`;
  return r.app;
}

/** Collapse variable ids (uuids, long hex, numbers) so the same error dedupes. */
function normalizeMessage(msg: string): string {
  return msg
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')
    .replace(/\d+/g, '<n>')
    .trim()
    .slice(0, 300);
}

/**
 * Groups identical crashes into one bug row. NOT a security primitive — it
 * hashes no secret and guards nothing, so collision resistance is irrelevant
 * here and sha1 is deliberate (SonarQube S4790 is reviewed as Safe for this
 * line). Do not "upgrade" it to sha256: the digest is persisted as
 * `Bug.fingerprint`, so changing the algorithm re-fingerprints every existing
 * bug and every open issue silently forks into a duplicate.
 */
function fingerprintOf(source: string, page: string, normMsg: string): string {
  return createHash('sha1').update(`${source}|${page}|${normMsg}`).digest('hex');
}

function envKey(environment: string): 'localhost' | 'staging' | 'production' {
  return VALID_ENVS.has(environment)
    ? (environment as 'localhost' | 'staging' | 'production')
    : 'production';
}

function clampRetention(days: unknown): number {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(90, n);
}

function clampRange(input?: number | null): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(90, n);
}

function cleanLevels(levels: unknown): TelemetryLevel[] {
  if (!Array.isArray(levels)) return ['error', 'warn'];
  const picked = levels.filter((l): l is TelemetryLevel => VALID_LEVELS.has(l as TelemetryLevel));
  return picked.length > 0 ? Array.from(new Set(picked)) : ['error', 'warn'];
}

/* ------------------------------ mappers -------------------------------- */

const settingsPub = (d: ITelemetrySettings) => ({
  signoz_enabled: d.signoz_enabled,
  persisted_levels: d.persisted_levels,
  retention_days: d.retention_days,
  public_api_key: d.public_api_key,
  updated_at: d.updated_at.toISOString(),
});

const mapError = (e?: { name: string; message: string; stack?: string }) =>
  e ? { name: e.name, message: e.message, stack: e.stack } : null;

const mapUser = (u?: ITelemetryUser | null) =>
  u?.id
    ? {
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        phone: u.phone ?? null,
        roles: u.roles ?? [],
      }
    : null;

const mapClient = (c?: ITelemetryClient | null) =>
  c
    ? {
        app_version: c.app_version ?? null,
        device_model: c.device_model ?? null,
        device_os_version: c.device_os_version ?? null,
        locale: c.locale ?? null,
        timezone: c.timezone ?? null,
        screen: c.screen ?? null,
        viewport: c.viewport ?? null,
        network: c.network ?? null,
        referrer: c.referrer ?? null,
      }
    : null;

const logPub = (d: ITelemetryLog) => ({
  id: String(d._id),
  app: d.app,
  portal: d.portal,
  platform: d.platform,
  os: d.os,
  environment: d.environment,
  source: d.source,
  level: d.level,
  page: d.page,
  component: d.component,
  url: d.url,
  host: d.host,
  error: mapError(d.error),
  data_json: d.data ? JSON.stringify(d.data) : null,
  user_id: d.user_id ?? null,
  user: mapUser(d.user),
  client: mapClient(d.client),
  duid: d.duid ?? null,
  session_id: d.session_id ?? null,
  ip: d.ip ?? null,
  user_agent: d.user_agent ?? null,
  created_at: d.created_at.toISOString(),
});

const bugPub = (d: IBug) => ({
  id: String(d._id),
  fingerprint: d.fingerprint,
  title: d.title,
  error_name: d.error_name,
  message: d.message,
  page: d.page,
  source: d.source,
  app: d.app,
  portal: d.portal,
  platform: d.platform,
  os: d.os,
  occurrence_count: d.occurrence_count,
  first_seen_at: d.first_seen_at.toISOString(),
  last_seen_at: d.last_seen_at.toISOString(),
  env_counts: {
    localhost: d.env_counts.localhost,
    staging: d.env_counts.staging,
    production: d.env_counts.production,
  },
  last_url: d.last_url,
  last_host: d.last_host,
  last_stack: d.last_stack,
  last_user: mapUser(d.last_user),
  last_environment: d.last_environment ?? null,
  last_app_version: d.last_app_version ?? null,
  last_user_agent: d.last_user_agent ?? null,
  last_duid: d.last_duid ?? null,
  last_session_id: d.last_session_id ?? null,
  affected_user_count: d.affected_user_count ?? 0,
  affected_user_ids: d.affected_user_ids ?? [],
  anonymous_count: d.anonymous_count ?? 0,
  status: d.status,
  resolved_at: d.resolved_at ? d.resolved_at.toISOString() : null,
  resolved_by: d.resolved_by ?? null,
  created_at: d.created_at.toISOString(),
});

/* --------------------------- table configs ----------------------------- */

const LOG_TABLE_CONFIG: TableEntityConfig = {
  // Searching a person by name or address is how a reported problem is found
  // again, so the identity fields are part of the free-text search too.
  searchFields: [
    'page',
    'component',
    'source',
    'error.message',
    'user.name',
    'user.email',
    'user_id',
  ],
  sortFields: {
    created_at: 'created_at',
    level: 'level',
    source: 'source',
    environment: 'environment',
    page: 'page',
    user: 'user.name',
  },
  filterFields: {
    level: { type: 'string' },
    source: { type: 'string' },
    environment: { type: 'string' },
    app: { type: 'string' },
    platform: { type: 'string' },
    os: { type: 'string' },
    page: { type: 'string' },
    // The error-module marker (@duncit/errors ISSUE_LOG_COMPONENT) — what the
    // Tech portal's Error Logs section filters on.
    component: { type: 'string' },
    user_id: { type: 'string' },
    user_email: { path: 'user.email', type: 'string' },
    duid: { type: 'string' },
    session_id: { type: 'string' },
    app_version: { path: 'client.app_version', type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const BUG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'message', 'page', 'source', 'last_user.name', 'last_user.email'],
  sortFields: {
    last_seen_at: 'last_seen_at',
    occurrence_count: 'occurrence_count',
    affected_user_count: 'affected_user_count',
    first_seen_at: 'first_seen_at',
    status: 'status',
  },
  filterFields: {
    status: { type: 'string' },
    source: { type: 'string' },
    app: { type: 'string' },
    platform: { type: 'string' },
    os: { type: 'string' },
    page: { type: 'string' },
    last_environment: { type: 'string' },
    affected_user_ids: { type: 'string' },
  },
  defaultSort: { last_seen_at: -1 },
};

/* --------------------------- bug aggregation --------------------------- */

/**
 * Fold one occurrence's account into the bug's "who does this hit" picture.
 *
 * The two writes are deliberately separate from the roll-up above: the count
 * may only move when this id is NOT already in the sample, which is a filter
 * on the document rather than a value in the update. Nobody signed in is its
 * own tally — a crash on the login screen is a real crash, and counting it as
 * "0 users affected" is how it gets ignored.
 */
async function recordBugUser(fingerprint: string, user?: ITelemetryUser): Promise<void> {
  if (!user?.id) {
    await BugModel.updateOne({ fingerprint }, { $inc: { anonymous_count: 1 } });
    return;
  }
  await BugModel.updateOne(
    { fingerprint, affected_user_ids: { $ne: user.id } },
    {
      $inc: { affected_user_count: 1 },
      $push: { affected_user_ids: { $each: [user.id], $slice: -BUG_USER_SAMPLE } },
    },
  );
}

async function upsertBug(
  record: TelemetryRecordInput,
  source: string,
  user?: ITelemetryUser,
): Promise<void> {
  const errName = record.error?.name ?? 'Error';
  const rawMsg = record.error?.message ?? record.component;
  const normMsg = normalizeMessage(rawMsg);
  const fingerprint = fingerprintOf(source, record.page, normMsg);
  const now = new Date();
  await BugModel.updateOne(
    { fingerprint },
    {
      $inc: { occurrence_count: 1, [`env_counts.${envKey(record.environment)}`]: 1 },
      $set: {
        title: `${errName}: ${normMsg}`.slice(0, 300),
        error_name: errName,
        message: rawMsg.slice(0, 500),
        source,
        app: record.app,
        portal: record.portal,
        platform: record.platform,
        os: record.os,
        last_seen_at: now,
        last_url: record.url,
        last_host: record.host,
        last_stack: record.error?.stack,
        last_environment: record.environment,
        last_app_version: record.client?.app_version,
        last_user_agent: record.user_agent,
        last_duid: record.duid,
        last_session_id: record.session_id,
        // Only when there IS one: an anonymous occurrence must not erase the
        // signed-in person the bug was last traced to.
        ...(user?.id ? { last_user: user } : {}),
      },
      $setOnInsert: { page: record.page, first_seen_at: now, status: 'OPEN' },
    },
    { upsert: true },
  );
  await recordBugUser(fingerprint, user);
  // Regression: a fresh occurrence reopens a RESOLVED bug (IGNORED stays silenced).
  await BugModel.updateOne(
    { fingerprint, status: 'RESOLVED' },
    { $set: { status: 'OPEN', resolved_at: null, resolved_by: null } },
  );
}

/* ------------------------------- import -------------------------------- */

/** One bug from an export file, matched on fingerprint when it lands. */
export interface BugImportEntry {
  fingerprint: string;
  title: string;
  error_name?: string | null;
  message?: string | null;
  page: string;
  source: string;
  app?: string | null;
  portal?: string | null;
  platform?: string | null;
  os?: string | null;
  occurrence_count?: number | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  env_counts?: {
    localhost?: number | null;
    staging?: number | null;
    production?: number | null;
  } | null;
  last_url?: string | null;
  last_host?: string | null;
  last_stack?: string | null;
  last_user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    roles?: string[] | null;
  } | null;
  last_environment?: string | null;
  last_app_version?: string | null;
  last_user_agent?: string | null;
  last_duid?: string | null;
  last_session_id?: string | null;
  affected_user_count?: number | null;
  affected_user_ids?: string[] | null;
  anonymous_count?: number | null;
  status?: string | null;
}

function toDate(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || value === '') return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toCount(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* --------------------------- log export/import ------------------------- */

/** One log row from an export file, matched on the id it already carries. */
export interface TelemetryLogImportEntry {
  id?: string | null;
  app: string;
  portal?: string | null;
  platform?: string | null;
  os?: string | null;
  environment?: string | null;
  source?: string | null;
  level: string;
  page: string;
  component: string;
  url?: string | null;
  host?: string | null;
  error?: { name?: string | null; message?: string | null; stack?: string | null } | null;
  data_json?: string | null;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    roles?: string[] | null;
  } | null;
  client?: Record<string, unknown> | null;
  duid?: string | null;
  session_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

/** Filters the two public JSON feeds accept, straight off the query string. */
export interface PublicLogFilters {
  level?: string | null;
  environment?: string | null;
  source?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  since_hours?: number | null;
  limit?: number | null;
}

export interface PublicBugFilters {
  status?: string | null;
  source?: string | null;
  limit?: number | null;
}

/** A file the operator downloads: generous, but never the whole collection. */
const MAX_EXPORT_ROWS = 20_000;
/** A URL a script polls: small enough to serve fast, raisable per request. */
const DEFAULT_FEED_ROWS = 200;
const MAX_FEED_ROWS = 5_000;

function clampExportLimit(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return MAX_EXPORT_ROWS;
  return Math.min(MAX_EXPORT_ROWS, n);
}

function clampFeedLimit(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_FEED_ROWS;
  return Math.min(MAX_FEED_ROWS, n);
}

/** `since_hours` window, or 0 for "no time bound at all". */
function clampHours(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 0;
  // Retention tops out at 90 days, so a longer window can only mean "all".
  return Math.min(90 * 24, n);
}

/** The `data` blob travels as a JSON string; anything unreadable is dropped. */
function parseDataJson(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

const trimmed = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** An import entry as the document it will be stored as, id and all. */
function logImportDoc(entry: TelemetryLogImportEntry): Record<string, unknown> {
  const level = VALID_LEVELS.has(entry.level as TelemetryLevel) ? entry.level : 'info';
  const app = trimmed(entry.app) ?? 'unknown';
  const userId = trimmed(entry.user?.id);
  return {
    // A file from another database keeps its ids, so a re-import is a no-op.
    _id: isValidObjectId(entry.id) ? new Types.ObjectId(String(entry.id)) : new Types.ObjectId(),
    app,
    portal: trimmed(entry.portal),
    platform: trimmed(entry.platform) ?? 'unknown',
    os: trimmed(entry.os),
    environment: VALID_ENVS.has(String(entry.environment)) ? entry.environment : 'production',
    source: trimmed(entry.source) ?? app,
    level,
    page: trimmed(entry.page) ?? 'unknown',
    component: trimmed(entry.component) ?? 'unknown',
    url: trimmed(entry.url),
    host: trimmed(entry.host),
    error: entry.error?.message
      ? {
          name: trimmed(entry.error.name) ?? 'Error',
          message: entry.error.message,
          stack: trimmed(entry.error.stack),
        }
      : undefined,
    data: parseDataJson(entry.data_json),
    user_id: userId,
    user: userId
      ? {
          id: userId,
          name: trimmed(entry.user?.name),
          email: trimmed(entry.user?.email),
          phone: trimmed(entry.user?.phone),
          roles: entry.user?.roles ?? undefined,
        }
      : undefined,
    client: entry.client ?? undefined,
    duid: trimmed(entry.duid),
    session_id: trimmed(entry.session_id),
    ip: trimmed(entry.ip),
    user_agent: trimmed(entry.user_agent),
    created_at: toDate(entry.created_at, new Date()),
  };
}

/* ------------------------- dashboard aggregation ----------------------- */

async function groupCount(
  match: Record<string, unknown>,
  field: string,
): Promise<Array<{ key: string; count: number }>> {
  const rows = await TelemetryLogModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: field, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ key: String(r._id), count: r.count }));
}

async function dailySeries(since: Date): Promise<Array<{ date: string; count: number }>> {
  const rows = await TelemetryLogModel.aggregate<{ _id: string; count: number }>([
    { $match: { created_at: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

/* -------------------------------- service ------------------------------ */

export const telemetryService = {
  async getSettings() {
    return settingsPub(await getTelemetrySettings());
  },

  async updateSettings(input: {
    signoz_enabled?: boolean;
    persisted_levels?: string[];
    retention_days?: number;
  }) {
    const update: Record<string, unknown> = {};
    if (input.signoz_enabled !== undefined) update.signoz_enabled = input.signoz_enabled;
    if (input.persisted_levels !== undefined)
      update.persisted_levels = cleanLevels(input.persisted_levels);
    if (input.retention_days !== undefined)
      update.retention_days = clampRetention(input.retention_days);
    const doc = await TelemetrySettingsModel.findOneAndUpdate(
      { singleton_key: 'telemetry' },
      { $set: update },
      { new: true, upsert: true },
    );
    await this.refreshRuntime();
    return settingsPub(doc);
  },

  async seedDefaults() {
    await TelemetrySettingsModel.updateOne(
      { singleton_key: 'telemetry' },
      {
        $setOnInsert: {
          signoz_enabled: true,
          persisted_levels: ['error', 'warn'],
          retention_days: 30,
        },
      },
      { upsert: true },
    );
    await this.refreshRuntime();
  },

  /** Push the persisted-levels + SigNoz flag into the synchronous log funnel. */
  async refreshRuntime() {
    const s = await getTelemetrySettings();
    telemetryRuntime.configure({
      signozEnabled: s.signoz_enabled,
      persistLevels: s.persisted_levels,
    });
  },

  /** Wire the log funnel's persist handler to this service (called once at boot). */
  enableIngestion() {
    telemetryRuntime.registerPersistHandler((raw) => {
      telemetryService.recordTelemetryLog(raw as TelemetryRecordInput).catch(() => undefined);
    });
  },

  /** Persist one log + roll error-level logs into a Bug. Fire-and-forget from the funnel. */
  async recordTelemetryLog(record: TelemetryRecordInput): Promise<void> {
    const source = computeSource(record);
    // Resolved once and shared: the log row and the bug roll-up must name the
    // same person, and a second lookup would be a second chance to disagree.
    const user = record.user ? await resolveLogUser(record.user) : undefined;
    await TelemetryLogModel.create({
      app: record.app,
      portal: record.portal,
      platform: record.platform,
      os: record.os,
      environment: record.environment,
      source,
      level: record.level,
      page: record.page,
      component: record.component,
      url: record.url,
      host: record.host,
      error: record.error,
      data: record.data,
      user_id: user?.id,
      user,
      client: record.client,
      duid: record.duid,
      session_id: record.session_id,
      ip: record.ip,
      user_agent: record.user_agent,
    });
    if (record.level === 'error') await upsertBug(record, source, user);
  },

  async logsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ITelemetryLog>(
      TelemetryLogModel,
      {},
      input,
      LOG_TABLE_CONFIG,
    );
    return { rows: docs.map(logPub), total, page, page_size };
  },

  async bugsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IBug>(
      BugModel,
      {},
      input,
      BUG_TABLE_CONFIG,
    );
    return { rows: docs.map(bugPub), total, page, page_size };
  },

  async bug(id: string) {
    const doc = await BugModel.findById(id);
    return doc ? bugPub(doc) : null;
  },

  /**
   * The recent persisted error logs behind one bug. Logs carry no fingerprint,
   * so each candidate (same source + page, error level) is re-fingerprinted with
   * the exact identity function `upsertBug` used — which also makes logs written
   * before this query existed match.
   */
  async bugOccurrences(bugId: string, limit?: number | null) {
    const bug = await BugModel.findById(bugId);
    if (!bug)
      throw new GraphQLError('Bug not found', { extensions: { code: 'NOT_FOUND' } });
    const wanted = Math.min(50, Math.max(1, Math.trunc(Number(limit ?? 20)) || 20));
    const candidates = await TelemetryLogModel.find({
      level: 'error',
      source: bug.source,
      page: bug.page,
    })
      .sort({ created_at: -1 })
      .limit(400);
    const matches = candidates.filter((log) => {
      const rawMsg = log.error?.message ?? log.component;
      return fingerprintOf(log.source, log.page, normalizeMessage(rawMsg)) === bug.fingerprint;
    });
    return matches.slice(0, wanted).map(logPub);
  },

  /** Every bug, unpaginated — the JSON export. Retention keeps the set bounded. */
  async bugsExport() {
    const docs = await BugModel.find({}).sort({ last_seen_at: -1 });
    return docs.map(bugPub);
  },

  /**
   * One level's logs as a file. Bounded, unlike the bug export: a busy day of
   * `info` is six figures of rows, and an export that tries to be complete
   * would time out instead of producing anything. Newest first, so a truncated
   * file is the useful end of the range rather than an arbitrary slice.
   */
  async logsExport(level?: string | null, limit?: number | null) {
    const filter = VALID_LEVELS.has(level as TelemetryLevel) ? { level } : {};
    const docs = await TelemetryLogModel.find(filter)
      .sort({ created_at: -1 })
      .limit(clampExportLimit(limit));
    return docs.map(logPub);
  },

  /**
   * Load logs from an export file.
   *
   * Matched on the id the row already carries, so importing the same file
   * twice adds nothing the second time and a file can be replayed into a
   * rebuilt database without doubling its history. A row with no usable id is
   * a new row — a hand-written file still lands.
   */
  async importLogs(entries: TelemetryLogImportEntry[], actor: { id: string }) {
    if (entries.length === 0) return { created: 0, skipped: 0 };
    const ops = entries.map((entry) => {
      const doc = logImportDoc(entry);
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      };
    });
    const res = await TelemetryLogModel.bulkWrite(ops, { ordered: false });
    const created = res.upsertedCount ?? 0;
    logs.server.warn('telemetry', 'logsImport', {
      userId: actor.id,
      created,
      skipped: entries.length - created,
    });
    return { created, skipped: entries.length - created };
  },

  /**
   * Mint a new key for the public JSON feeds. Every URL copied before this
   * call stops working the moment it returns — which is the entire point.
   */
  async rotatePublicApiKey(actor: { id: string }) {
    logs.server.warn('telemetry', 'publicApiKeyRotated', { userId: actor.id });
    const doc = await TelemetrySettingsModel.findOneAndUpdate(
      { singleton_key: 'telemetry' },
      { $set: { public_api_key: mintTelemetryApiKey() } },
      { new: true, upsert: true },
    );
    return settingsPub(doc);
  },

  /**
   * Whether a key from a feed URL is the one on file.
   *
   * Compared in constant time: these URLs are meant to be pasted into scripts
   * and monitors, so the endpoint is hit repeatedly by machines, and a
   * length-or-first-difference comparison is exactly the shape a timing attack
   * needs to walk the key out one character at a time.
   */
  async publicKeyMatches(key: string): Promise<boolean> {
    if (!key) return false;
    const settings = await getTelemetrySettings();
    const expected = Buffer.from(settings.public_api_key, 'utf8');
    const given = Buffer.from(key, 'utf8');
    return expected.length === given.length && timingSafeEqual(expected, given);
  },

  /** The read-only log feed behind `GET /telemetry/logs.json`. */
  async publicLogsFeed(filters: PublicLogFilters) {
    const query: Record<string, unknown> = {};
    if (VALID_LEVELS.has(filters.level as TelemetryLevel)) query.level = filters.level;
    if (filters.environment) query.environment = filters.environment;
    if (filters.source) query.source = filters.source;
    if (filters.user_id) query.user_id = filters.user_id;
    if (filters.session_id) query.session_id = filters.session_id;
    const hours = clampHours(filters.since_hours);
    if (hours) query.created_at = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    const docs = await TelemetryLogModel.find(query)
      .sort({ created_at: -1 })
      .limit(clampFeedLimit(filters.limit));
    return docs.map(logPub);
  },

  /** The read-only bug feed behind `GET /telemetry/bugs.json`. */
  async publicBugsFeed(filters: PublicBugFilters) {
    const query: Record<string, unknown> = {};
    if (BUG_STATUSES.has(filters.status as BugStatus)) query.status = filters.status;
    if (filters.source) query.source = filters.source;
    const docs = await BugModel.find(query)
      .sort({ last_seen_at: -1 })
      .limit(clampFeedLimit(filters.limit));
    return docs.map(bugPub);
  },

  async deleteBugs(ids: string[], actor: { id: string }): Promise<number> {
    if (ids.length === 0) return 0;
    const valid = ids.filter((id) => isValidObjectId(id));
    logs.server.warn('telemetry', 'bugsDeleteMany', { userId: actor.id, requested: valid.length });
    const res = await BugModel.deleteMany({ _id: { $in: valid } });
    return res.deletedCount ?? 0;
  },

  /**
   * Clear every bug. The warning is written before the delete and at `warn`,
   * which the telemetry runtime persists — so the record of who emptied the
   * collection lands in TelemetryLog and outlives the rows it is about.
   */
  async deleteAllBugs(actor: { id: string }): Promise<number> {
    logs.server.warn('telemetry', 'bugsDeleteAll', { userId: actor.id });
    const res = await BugModel.deleteMany({});
    return res.deletedCount ?? 0;
  },

  /** Upsert bugs from an export file, matched on fingerprint (existing rows overwritten). */
  async importBugs(entries: BugImportEntry[], actor: { id: string }) {
    let created = 0;
    let updated = 0;
    const now = new Date();
    for (const entry of entries) {
      const fingerprint = entry.fingerprint.trim();
      if (!fingerprint)
        throw new GraphQLError('An imported bug has an empty fingerprint', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      const status = BUG_STATUSES.has(entry.status as BugStatus) ? entry.status : 'OPEN';
      const res = await BugModel.updateOne(
        { fingerprint },
        {
          $set: {
            title: entry.title.slice(0, 300),
            error_name: entry.error_name ?? 'Error',
            message: (entry.message ?? '').slice(0, 500),
            page: entry.page,
            source: entry.source,
            app: entry.app ?? entry.source.split(':')[0],
            portal: entry.portal ?? undefined,
            platform: entry.platform ?? 'unknown',
            os: entry.os ?? undefined,
            occurrence_count: Math.max(1, toCount(entry.occurrence_count)),
            first_seen_at: toDate(entry.first_seen_at, now),
            last_seen_at: toDate(entry.last_seen_at, now),
            env_counts: {
              localhost: toCount(entry.env_counts?.localhost),
              staging: toCount(entry.env_counts?.staging),
              production: toCount(entry.env_counts?.production),
            },
            last_url: entry.last_url ?? undefined,
            last_host: entry.last_host ?? undefined,
            last_stack: entry.last_stack ?? undefined,
            last_user: entry.last_user?.id
              ? {
                  id: entry.last_user.id,
                  name: entry.last_user.name ?? undefined,
                  email: entry.last_user.email ?? undefined,
                  phone: entry.last_user.phone ?? undefined,
                  roles: entry.last_user.roles ?? undefined,
                }
              : undefined,
            last_environment: entry.last_environment ?? undefined,
            last_app_version: entry.last_app_version ?? undefined,
            last_user_agent: entry.last_user_agent ?? undefined,
            last_duid: entry.last_duid ?? undefined,
            last_session_id: entry.last_session_id ?? undefined,
            affected_user_count: toCount(entry.affected_user_count),
            // Capped on the way in too: a file could otherwise carry an array
            // longer than the roll-up would ever grow on its own.
            affected_user_ids: (entry.affected_user_ids ?? []).slice(-BUG_USER_SAMPLE),
            anonymous_count: toCount(entry.anonymous_count),
            status,
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount > 0) created += 1;
      else updated += 1;
    }
    logs.server.warn('telemetry', 'bugsImport', { userId: actor.id, created, updated });
    return { created, updated };
  },

  async updateBugStatus(id: string, status: string, userId: string) {
    if (!BUG_STATUSES.has(status as BugStatus))
      throw new GraphQLError('Invalid bug status', { extensions: { code: 'BAD_USER_INPUT' } });
    const set: Record<string, unknown> = { status };
    if (status === 'RESOLVED') {
      set.resolved_at = new Date();
      set.resolved_by = userId;
    } else {
      set.resolved_at = null;
      set.resolved_by = null;
    }
    const doc = await BugModel.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!doc) throw new GraphQLError('Bug not found', { extensions: { code: 'NOT_FOUND' } });
    return bugPub(doc);
  },

  async dashboard(rangeDays?: number | null) {
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const match = { created_at: { $gte: since } };
    const [total_logs, by_level, by_source, by_environment, series, topBugs, active_bugs] =
      await Promise.all([
        TelemetryLogModel.countDocuments(match),
        groupCount(match, '$level'),
        groupCount(match, '$source'),
        groupCount(match, '$environment'),
        dailySeries(since),
        BugModel.find({ status: 'OPEN' }).sort({ occurrence_count: -1 }).limit(10),
        BugModel.countDocuments({ status: 'OPEN' }),
      ]);
    return {
      range_days: days,
      total_logs,
      active_bugs,
      by_level,
      by_source,
      by_environment,
      series,
      top_bugs: topBugs.map(bugPub),
    };
  },

  /** Delete persisted logs + bugs past the admin-configured retention window. */
  async runTelemetryCleanup() {
    const settings = await getTelemetrySettings();
    const cutoff = new Date(Date.now() - clampRetention(settings.retention_days) * DAY_MS);
    const [logsRes, bugsRes] = await Promise.all([
      TelemetryLogModel.deleteMany({ created_at: { $lt: cutoff } }),
      BugModel.deleteMany({ last_seen_at: { $lt: cutoff } }),
    ]);
    return { logs_deleted: logsRes.deletedCount, bugs_deleted: bugsRes.deletedCount };
  },
};
