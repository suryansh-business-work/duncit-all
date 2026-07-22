import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { telemetryRuntime } from '@observability/telemetryRuntime';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  BugModel,
  TelemetryLogModel,
  TelemetrySettingsModel,
  getTelemetrySettings,
  type BugStatus,
  type IBug,
  type ITelemetryLog,
  type ITelemetrySettings,
  type TelemetryLevel,
} from './telemetry.model';

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
  updated_at: d.updated_at.toISOString(),
});

const mapError = (e?: { name: string; message: string; stack?: string }) =>
  e ? { name: e.name, message: e.message, stack: e.stack } : null;

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
  status: d.status,
  resolved_at: d.resolved_at ? d.resolved_at.toISOString() : null,
  created_at: d.created_at.toISOString(),
});

/* --------------------------- table configs ----------------------------- */

const LOG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['page', 'component', 'source', 'error.message'],
  sortFields: {
    created_at: 'created_at',
    level: 'level',
    source: 'source',
    environment: 'environment',
    page: 'page',
  },
  filterFields: {
    level: { type: 'string' },
    source: { type: 'string' },
    environment: { type: 'string' },
    app: { type: 'string' },
    platform: { type: 'string' },
    os: { type: 'string' },
    page: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const BUG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'message', 'page', 'source'],
  sortFields: {
    last_seen_at: 'last_seen_at',
    occurrence_count: 'occurrence_count',
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
  },
  defaultSort: { last_seen_at: -1 },
};

/* --------------------------- bug aggregation --------------------------- */

async function upsertBug(record: TelemetryRecordInput, source: string): Promise<void> {
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
      },
      $setOnInsert: { page: record.page, first_seen_at: now, status: 'OPEN' },
    },
    { upsert: true },
  );
  // Regression: a fresh occurrence reopens a RESOLVED bug (IGNORED stays silenced).
  await BugModel.updateOne(
    { fingerprint, status: 'RESOLVED' },
    { $set: { status: 'OPEN', resolved_at: null, resolved_by: null } },
  );
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
    });
    if (record.level === 'error') await upsertBug(record, source);
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
