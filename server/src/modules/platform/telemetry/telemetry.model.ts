import { Schema, model, type Document } from 'mongoose';

/**
 * Telemetry singleton + the persisted-log + rolled-up-bug collections that back
 * the Tech portal's Telemetry Dashboard / Bugs / Logs Settings sections.
 *
 * Logs stream in through the shared funnel (observability/log.ts) and are written
 * here only for the admin-selected levels; a hard 90-day TTL index is the safety
 * net, and a daily cleanup job enforces the (shorter) admin retention window.
 *
 * This file is coverage-excluded (`*.model.ts`), so the lazy `getTelemetrySettings`
 * create-if-missing lives here (mirrors finance/settings singletons).
 */

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type BugStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

/* ------------------------------- settings ------------------------------- */

export interface ITelemetrySettings extends Document {
  singleton_key: string;
  /** Master switch for shipping logs to SigNoz (OTLP). DB persistence is separate. */
  signoz_enabled: boolean;
  /** Levels that get written to the TelemetryLog collection (the rest only ship to SigNoz). */
  persisted_levels: TelemetryLevel[];
  /** Days a persisted log/bug is kept before the daily cleanup deletes it (1..90). */
  retention_days: number;
  created_at: Date;
  updated_at: Date;
}

const telemetrySettingsSchema = new Schema<ITelemetrySettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'telemetry' },
    signoz_enabled: { type: Boolean, default: true },
    persisted_levels: { type: [String], default: ['error', 'warn'] },
    retention_days: { type: Number, default: 30, min: 1, max: 90 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const TelemetrySettingsModel = model<ITelemetrySettings>(
  'TelemetrySettings',
  telemetrySettingsSchema,
);

/** Lazy read of the telemetry singleton, creating it on first access. */
export async function getTelemetrySettings(): Promise<ITelemetrySettings> {
  let doc = await TelemetrySettingsModel.findOne({ singleton_key: 'telemetry' });
  if (!doc) doc = await TelemetrySettingsModel.create({ singleton_key: 'telemetry' });
  return doc;
}

/* -------------------------------- logs --------------------------------- */

export interface ITelemetryLog extends Document {
  app: string;
  portal?: string;
  platform: string;
  os?: string;
  environment: string;
  /** Normalized surface key, e.g. mWeb / mobileApp:ios / portal:crm / server. */
  source: string;
  level: TelemetryLevel;
  page: string;
  component: string;
  url?: string;
  host?: string;
  error?: { name: string; message: string; stack?: string };
  data?: Record<string, unknown>;
  created_at: Date;
}

const telemetryLogSchema = new Schema<ITelemetryLog>({
  app: { type: String, required: true },
  portal: { type: String },
  platform: { type: String, required: true },
  os: { type: String },
  environment: { type: String, required: true },
  source: { type: String, required: true },
  level: { type: String, required: true },
  page: { type: String, required: true },
  component: { type: String, required: true },
  url: { type: String },
  host: { type: String },
  error: {
    type: new Schema(
      { name: String, message: String, stack: String },
      { _id: false },
    ),
    default: undefined,
  },
  data: { type: Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now },
});

telemetryLogSchema.index({ level: 1, created_at: -1 });
telemetryLogSchema.index({ source: 1, created_at: -1 });
telemetryLogSchema.index({ environment: 1, created_at: -1 });
// Retention safety net: Mongo's TTL monitor drops logs older than 90 days.
telemetryLogSchema.index({ created_at: 1 }, { expireAfterSeconds: NINETY_DAYS_SECONDS });

export const TelemetryLogModel = model<ITelemetryLog>('TelemetryLog', telemetryLogSchema);

/* -------------------------------- bugs --------------------------------- */

export interface IBug extends Document {
  fingerprint: string;
  title: string;
  error_name: string;
  message: string;
  page: string;
  source: string;
  app: string;
  portal?: string;
  platform: string;
  os?: string;
  occurrence_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  env_counts: { localhost: number; staging: number; production: number };
  /** Latest occurrence's context, for the Bugs detail view. */
  last_url?: string;
  last_host?: string;
  last_stack?: string;
  status: BugStatus;
  resolved_at?: Date | null;
  resolved_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

const bugSchema = new Schema<IBug>(
  {
    fingerprint: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    error_name: { type: String, default: 'Error' },
    message: { type: String, default: '' },
    page: { type: String, required: true },
    source: { type: String, required: true },
    app: { type: String, required: true },
    portal: { type: String },
    platform: { type: String, required: true },
    os: { type: String },
    occurrence_count: { type: Number, default: 0 },
    first_seen_at: { type: Date, default: Date.now },
    last_seen_at: { type: Date, default: Date.now },
    env_counts: {
      localhost: { type: Number, default: 0 },
      staging: { type: Number, default: 0 },
      production: { type: Number, default: 0 },
    },
    last_url: { type: String },
    last_host: { type: String },
    last_stack: { type: String },
    status: { type: String, default: 'OPEN' },
    resolved_at: { type: Date, default: null },
    resolved_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

bugSchema.index({ status: 1, last_seen_at: -1 });
bugSchema.index({ occurrence_count: -1 });

export const BugModel = model<IBug>('Bug', bugSchema);
