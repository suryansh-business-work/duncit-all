import { randomBytes } from 'node:crypto';
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
  /**
   * The secret in the read-only JSON feed URLs (`/telemetry/logs.json?key=…`).
   *
   * Those routes carry no login — the point is that pasting the URL anywhere
   * returns JSON — so this string is the ONLY thing between the outside world
   * and every stack trace, email address and IP the platform has recorded.
   * Treat it as a password: rotate it the moment a URL leaves safe hands.
   */
  public_api_key: string;
  created_at: Date;
  updated_at: Date;
}

/** 32 unguessable hex characters. Minted in the model so a fresh install has one. */
export function mintTelemetryApiKey(): string {
  return randomBytes(16).toString('hex');
}

const telemetrySettingsSchema = new Schema<ITelemetrySettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'telemetry' },
    signoz_enabled: { type: Boolean, default: true },
    persisted_levels: { type: [String], default: ['error', 'warn'] },
    retention_days: { type: Number, default: 30, min: 1, max: 90 },
    public_api_key: { type: String, default: mintTelemetryApiKey },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const TelemetrySettingsModel = model<ITelemetrySettings>(
  'TelemetrySettings',
  telemetrySettingsSchema,
);

/**
 * Lazy read of the telemetry singleton, creating it on first access.
 *
 * A document written before the feed existed has no key, so one is minted on
 * read — otherwise the Copy GET API button would hand out a URL ending in
 * `key=undefined`, which the route refuses.
 */
export async function getTelemetrySettings(): Promise<ITelemetrySettings> {
  let doc = await TelemetrySettingsModel.findOne({ singleton_key: 'telemetry' });
  if (!doc) doc = await TelemetrySettingsModel.create({ singleton_key: 'telemetry' });
  if (!doc.public_api_key) {
    doc.public_api_key = mintTelemetryApiKey();
    await doc.save();
  }
  return doc;
}

/* -------------------------------- logs --------------------------------- */

/**
 * Who was signed in when the log was written.
 *
 * Every field is server-resolved: the id/email/roles come from the verified
 * JWT the request carried, the name and phone from that account's record. A
 * browser never gets to say who it is.
 */
export interface ITelemetryUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  roles?: string[];
}

/** The machine the surface was running on, as it described itself. */
export interface ITelemetryClient {
  app_version?: string;
  device_model?: string;
  device_os_version?: string;
  locale?: string;
  timezone?: string;
  screen?: string;
  viewport?: string;
  network?: string;
  referrer?: string;
}

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
  /** Denormalized user id, so the collection can be filtered on one person. */
  user_id?: string;
  user?: ITelemetryUser;
  client?: ITelemetryClient;
  /** Device id (`x-duid`) and the surface's per-tab / per-launch id. */
  duid?: string;
  session_id?: string;
  /** Read off the request, never from the body. */
  ip?: string;
  user_agent?: string;
  created_at: Date;
}

const telemetryUserSchema = new Schema<ITelemetryUser>(
  {
    id: String,
    name: String,
    email: String,
    phone: String,
    roles: [String],
  },
  { _id: false },
);

const telemetryClientSchema = new Schema<ITelemetryClient>(
  {
    app_version: String,
    device_model: String,
    device_os_version: String,
    locale: String,
    timezone: String,
    screen: String,
    viewport: String,
    network: String,
    referrer: String,
  },
  { _id: false },
);

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
  user_id: { type: String },
  user: { type: telemetryUserSchema, default: undefined },
  client: { type: telemetryClientSchema, default: undefined },
  duid: { type: String },
  session_id: { type: String },
  ip: { type: String },
  user_agent: { type: String },
  created_at: { type: Date, default: Date.now },
});

telemetryLogSchema.index({ level: 1, created_at: -1 });
telemetryLogSchema.index({ source: 1, created_at: -1 });
telemetryLogSchema.index({ environment: 1, created_at: -1 });
// "Everything this person hit" is the first question asked of a reported bug.
telemetryLogSchema.index({ user_id: 1, created_at: -1 });
telemetryLogSchema.index({ session_id: 1, created_at: -1 });
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
  /** The person who hit it most recently — the one worth calling back. */
  last_user?: ITelemetryUser;
  last_environment?: string;
  last_app_version?: string;
  last_user_agent?: string;
  last_duid?: string;
  last_session_id?: string;
  last_ip?: string;
  /**
   * The machine the latest occurrence ran on.
   *
   * Kept on the bug rather than left to the occurrence list, because the two
   * have different lifetimes: occurrences fall out of the retention window
   * while the bug survives, and "reproduces only on Android 9, offline" must
   * not disappear with them.
   */
  last_client?: ITelemetryClient;
  /**
   * How many distinct accounts have hit this bug — "one developer" versus
   * "everyone", which is the difference between triage tomorrow and tonight.
   *
   * EXACT up to {@link BUG_USER_SAMPLE}, then approximate: the ids are kept as
   * a bounded sample rather than an unbounded array (a production bug can be
   * hit by every account there is), so past the cap a returning user whose id
   * has aged out counts twice. Anonymous hits are counted separately and never
   * inflate this.
   */
  affected_user_count: number;
  /** Bounded, most-recent-first sample of the ids behind that count. */
  affected_user_ids: string[];
  /** Occurrences with nobody signed in — a crash on the login screen. */
  anonymous_count: number;
  status: BugStatus;
  resolved_at?: Date | null;
  resolved_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

/** How many distinct user ids one bug keeps. Past this the count approximates. */
export const BUG_USER_SAMPLE = 50;

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
    last_user: { type: telemetryUserSchema, default: undefined },
    last_environment: { type: String },
    last_app_version: { type: String },
    last_user_agent: { type: String },
    last_duid: { type: String },
    last_session_id: { type: String },
    last_ip: { type: String },
    last_client: { type: telemetryClientSchema, default: undefined },
    affected_user_count: { type: Number, default: 0 },
    affected_user_ids: { type: [String], default: [] },
    anonymous_count: { type: Number, default: 0 },
    status: { type: String, default: 'OPEN' },
    resolved_at: { type: Date, default: null },
    resolved_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

bugSchema.index({ status: 1, last_seen_at: -1 });
bugSchema.index({ occurrence_count: -1 });
bugSchema.index({ affected_user_count: -1 });

export const BugModel = model<IBug>('Bug', bugSchema);
