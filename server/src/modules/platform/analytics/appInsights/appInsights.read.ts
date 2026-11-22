import { GraphQLError } from 'graphql';
import { AppInsightDayModel, AppInsightSyncLogModel, type IAppInsightSyncLog } from './appInsights.model';
import {
  APPLE_METRICS,
  PLAY_METRICS,
  REVIEW_METRICS,
  type AppInsightDimension,
  type AppInsightStore,
} from './appInsights.metrics';

/**
 * The history as rows, for the page's data tables (and their CSV download),
 * and the sync log. Every metric is its own nullable column; a store that
 * does not report a metric leaves it null rather than 0, so an export never
 * claims a zero nobody measured.
 */

/** Every metric column the daily table carries, both stores' together. */
export const DAILY_METRICS: readonly string[] = [
  ...new Set<string>([...Object.values(PLAY_METRICS), ...Object.values(APPLE_METRICS), ...REVIEW_METRICS]),
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
/** Rows one read returns at most — a year of every country and version stays well under it. */
export const MAX_DAILY_ROWS = 20_000;
const MAX_LOGS = 200;

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export interface DailyArgs {
  store: AppInsightStore;
  from: string;
  to: string;
  dimension?: AppInsightDimension | null;
}

/** Throws on a malformed, reversed or over-long range. */
export function checkRange(from: string, to: string): void {
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to)) throw badInput('Dates must be written yyyy-MM-dd.');
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;
  if (!Number.isFinite(span) || span < 0) throw badInput('The start date must be on or before the end date.');
  if (span >= MAX_RANGE_DAYS) throw badInput('A range can cover at most a year.');
}

export async function appInsightsDaily(args: DailyArgs) {
  checkRange(args.from, args.to);
  const dimension = args.dimension ?? 'TOTAL';
  const docs = await AppInsightDayModel.find({ store: args.store, dimension, day: { $gte: args.from, $lte: args.to } })
    .sort({ day: 1, key: 1 })
    .limit(MAX_DAILY_ROWS)
    .lean<Array<{ _id: unknown; store: AppInsightStore; day: string; dimension: AppInsightDimension; key: string; m: Record<string, number> }>>();
  return docs.map((doc) => {
    const metrics = Object.fromEntries(DAILY_METRICS.map((metric) => [metric, doc.m?.[metric] ?? null]));
    return { id: String(doc._id), store: doc.store, day: doc.day, dimension: doc.dimension, key: doc.key, ...metrics };
  });
}

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

export async function appInsightsSyncLogs(store?: AppInsightStore | null, limit?: number | null) {
  const take = Math.min(MAX_LOGS, Math.max(1, Math.round(limit ?? 50)));
  const docs = await AppInsightSyncLogModel.find(store ? { store } : {})
    .sort({ started_at: -1 })
    .limit(take)
    .lean<IAppInsightSyncLog[]>();
  return docs.map((doc) => ({
    id: String(doc._id),
    store: doc.store,
    trigger: doc.trigger,
    outcome: doc.outcome,
    started_at: doc.started_at.toISOString(),
    finished_at: iso(doc.finished_at),
    duration_ms: doc.finished_at ? doc.finished_at.getTime() - doc.started_at.getTime() : null,
    sources_read: doc.sources_read,
    sources_skipped: doc.sources_skipped,
    rows_written: doc.rows_written,
    api_calls: doc.api_calls,
    retries: doc.retries,
    message: doc.message,
  }));
}
