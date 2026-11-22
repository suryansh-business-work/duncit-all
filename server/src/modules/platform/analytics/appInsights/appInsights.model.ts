import { Schema, model, type Document } from 'mongoose';
import type { AppInsightDimension, AppInsightStore } from './appInsights.metrics';

/**
 * App Insights' history: what Google Play and the App Store reported about the
 * app, one document per store, day and slice.
 *
 * The stores keep their reports for a limited time and answer slowly, so the
 * dashboard never reads them live — a sync copies each report in once and
 * every page reads from here. A report that the store re-issues (Google
 * rewrites a month's file every day of that month) replaces the numbers it
 * owns for its days, so a re-run is always safe.
 */

const STORES = ['GOOGLE_PLAY', 'APP_STORE'] as const;
const DIMENSIONS = ['TOTAL', 'COUNTRY', 'VERSION'] as const;

export interface IAppInsightDay extends Document {
  store: AppInsightStore;
  /** The store's own calendar day, yyyy-MM-dd. */
  day: string;
  dimension: AppInsightDimension;
  /** '' for TOTAL; a country code; a version. */
  key: string;
  /** Metric name → value. Only what the store reported is present. */
  m: Record<string, number>;
  updated_at: Date;
}

const appInsightDaySchema = new Schema<IAppInsightDay>(
  {
    store: { type: String, enum: STORES, required: true },
    day: { type: String, required: true },
    dimension: { type: String, enum: DIMENSIONS, required: true },
    key: { type: String, default: '' },
    m: { type: Schema.Types.Mixed, default: {} },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'app_insight_days', minimize: false }
);

appInsightDaySchema.index({ store: 1, dimension: 1, day: 1, key: 1 }, { unique: true });

export const AppInsightDayModel = model<IAppInsightDay>('AppInsightDay', appInsightDaySchema);

export type AppInsightSyncTrigger = 'SCHEDULE' | 'MANUAL';

/** One store's integration: the sync lock, the last outcome and what Apple's report request is. */
export interface IAppInsightState extends Document {
  store: AppInsightStore;
  /** Held while a sync runs; a stale one (crashed process) is taken over after SYNC_STALE_MS. */
  syncing: boolean;
  sync_started_at: Date | null;
  last_attempt_at: Date | null;
  last_success_at: Date | null;
  /** The last failure's reason, credential-free; '' after a success. */
  last_error: string;
  /** App Store only: the App Store Connect app id and the ONGOING analytics report request. */
  app_id: string;
  report_request_id: string;
  /** The last day whose reviews were read completely — the next sync starts a little before it. */
  reviews_through: string;
}

const appInsightStateSchema = new Schema<IAppInsightState>(
  {
    store: { type: String, enum: STORES, required: true, unique: true },
    syncing: { type: Boolean, default: false },
    sync_started_at: { type: Date, default: null },
    last_attempt_at: { type: Date, default: null },
    last_success_at: { type: Date, default: null },
    last_error: { type: String, default: '' },
    app_id: { type: String, default: '' },
    report_request_id: { type: String, default: '' },
    reviews_through: { type: String, default: '' },
  },
  { collection: 'app_insight_states' }
);

export const AppInsightStateModel = model<IAppInsightState>('AppInsightState', appInsightStateSchema);

export type AppInsightSyncOutcome = 'RUNNING' | 'SUCCESS' | 'FAILED';

/** One sync of one store — the API sync log the page lists. */
export interface IAppInsightSyncLog extends Document {
  store: AppInsightStore;
  trigger: AppInsightSyncTrigger;
  outcome: AppInsightSyncOutcome;
  /** Who pressed Sync now; '' for the schedule. */
  by: string;
  started_at: Date;
  finished_at: Date | null;
  /** Report files (Google) or report instances and review pages (Apple) read this time. */
  sources_read: number;
  /** Already read before and unchanged, so skipped. */
  sources_skipped: number;
  rows_written: number;
  api_calls: number;
  retries: number;
  /** What happened, in one line; the failure's reason on FAILED. Never a credential. */
  message: string;
}

/** Sync logs are kept this long; the history they produced is kept for good. */
const LOG_TTL_SECONDS = 90 * 24 * 60 * 60;

const appInsightSyncLogSchema = new Schema<IAppInsightSyncLog>(
  {
    store: { type: String, enum: STORES, required: true },
    trigger: { type: String, enum: ['SCHEDULE', 'MANUAL'], required: true },
    outcome: { type: String, enum: ['RUNNING', 'SUCCESS', 'FAILED'], required: true },
    by: { type: String, default: '' },
    started_at: { type: Date, required: true },
    finished_at: { type: Date, default: null },
    sources_read: { type: Number, default: 0 },
    sources_skipped: { type: Number, default: 0 },
    rows_written: { type: Number, default: 0 },
    api_calls: { type: Number, default: 0 },
    retries: { type: Number, default: 0 },
    message: { type: String, default: '' },
  },
  { collection: 'app_insight_sync_logs' }
);

appInsightSyncLogSchema.index({ started_at: 1 }, { expireAfterSeconds: LOG_TTL_SECONDS });
appInsightSyncLogSchema.index({ store: 1, started_at: -1 });

export const AppInsightSyncLogModel = model<IAppInsightSyncLog>('AppInsightSyncLog', appInsightSyncLogSchema);

/**
 * A report already read: a Google Cloud Storage object at one generation, or
 * an Apple report instance. The next sync skips it unless Google has written
 * a newer generation — the cache that keeps a daily sync to a few downloads.
 */
export interface IAppInsightSource extends Document {
  store: AppInsightStore;
  /** The object name or instance id. */
  ref: string;
  /** Google's object generation; '' for Apple instances, which never change. */
  version: string;
  read_at: Date;
}

const appInsightSourceSchema = new Schema<IAppInsightSource>(
  {
    store: { type: String, enum: STORES, required: true },
    ref: { type: String, required: true },
    version: { type: String, default: '' },
    read_at: { type: Date, default: Date.now },
  },
  { collection: 'app_insight_sources' }
);

appInsightSourceSchema.index({ store: 1, ref: 1 }, { unique: true });

export const AppInsightSourceModel = model<IAppInsightSource>('AppInsightSource', appInsightSourceSchema);
