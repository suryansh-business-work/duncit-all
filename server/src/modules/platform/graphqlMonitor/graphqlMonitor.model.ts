import { Schema, model, type Document } from 'mongoose';

/**
 * GraphQL Monitor storage.
 *
 * Nothing here is written per request. The plugin counts into memory and the
 * flusher folds a minute of traffic into a handful of `$inc` upserts, so the
 * cost to the database is bounded by how many DIFFERENT operations ran, never
 * by how many requests did. Every collection expires on its own `expires_at`,
 * stamped from the admin-configured retention when the row is written.
 */

export type StatGranularity = 'MINUTE' | 'HOUR';

/** The op_key of the rollup that counts every operation together. */
export const ALL_OPERATIONS_KEY = '*';

/** Minute rollups only feed the short ranges, so they outlive them by a day, not by the retention. */
export const MINUTE_RETENTION_MS = 48 * 3_600_000;

/* ── settings ────────────────────────────────────────────────────────────── */

export interface IGraphqlMonitorSettings extends Document {
  key: string;
  enabled: boolean;
  field_sample_pct: number;
  retention_days: number;
  slow_threshold_ms: number;
  updated_at: Date;
}

const settingsSchema = new Schema<IGraphqlMonitorSettings>(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    // Timing every resolver costs a callback per field; one request in ten is
    // plenty to rank fields and keep a slow trace per operation.
    field_sample_pct: { type: Number, default: 10 },
    retention_days: { type: Number, default: 14 },
    slow_threshold_ms: { type: Number, default: 1000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const GraphqlMonitorSettingsModel = model<IGraphqlMonitorSettings>('GraphqlMonitorSettings', settingsSchema);

export const GRAPHQL_MONITOR_SETTINGS_KEY = 'graphql_monitor';

/* ── the operation registry: one row per signature ever seen ─────────────── */

const operationSchema = new Schema(
  {
    op_key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    signature: { type: String, default: '' },
    root_fields: { type: [String], default: [] },
    fields: { type: [String], default: [] },
    first_seen_at: { type: Date, required: true },
    last_seen_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false }
);
operationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const GraphqlOperationModel = model('GraphqlOperation', operationSchema);

/* ── per-operation rollups, by minute and by hour ────────────────────────── */

const operationStatSchema = new Schema(
  {
    granularity: { type: String, enum: ['MINUTE', 'HOUR'], required: true },
    bucket_start: { type: Date, required: true },
    op_key: { type: String, required: true },
    requests: { type: Number, default: 0 },
    // Requests that answered with at least one error, not the error count.
    errors: { type: Number, default: 0 },
    cached: { type: Number, default: 0 },
    executed: { type: Number, default: 0 },
    duration_total_ms: { type: Number, default: 0 },
    duration_max_ms: { type: Number, default: 0 },
    parse_total_ms: { type: Number, default: 0 },
    validate_total_ms: { type: Number, default: 0 },
    execute_total_ms: { type: Number, default: 0 },
    hist: { type: Schema.Types.Mixed, default: {} },
    clients: { type: Schema.Types.Mixed, default: {} },
    error_codes: { type: Schema.Types.Mixed, default: {} },
    last_seen_at: { type: Date },
    expires_at: { type: Date, required: true },
  },
  // `errors` is a count here; Mongoose reserves the name on documents, which is
  // harmless for these rows because they are only ever read through aggregate.
  { versionKey: false, suppressReservedKeysWarning: true }
);
operationStatSchema.index({ granularity: 1, op_key: 1, bucket_start: 1 }, { unique: true });
operationStatSchema.index({ granularity: 1, bucket_start: 1 });
operationStatSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const GraphqlOperationStatModel = model('GraphqlOperationStat', operationStatSchema);

/* ── per-field rollups, by hour ──────────────────────────────────────────── */

const fieldStatSchema = new Schema(
  {
    bucket_start: { type: Date, required: true },
    coordinate: { type: String, required: true },
    // Operations that selected the field — exact, counted on every request.
    referenced: { type: Number, default: 0 },
    // Resolver timings — from the sampled requests only.
    sampled_calls: { type: Number, default: 0 },
    sampled_errors: { type: Number, default: 0 },
    duration_total_ms: { type: Number, default: 0 },
    duration_max_ms: { type: Number, default: 0 },
    last_seen_at: { type: Date },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false }
);
fieldStatSchema.index({ coordinate: 1, bucket_start: 1 }, { unique: true });
fieldStatSchema.index({ bucket_start: 1 });
fieldStatSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const GraphqlFieldStatModel = model('GraphqlFieldStat', fieldStatSchema);

/* ── error groups, by hour ───────────────────────────────────────────────── */

const errorStatSchema = new Schema(
  {
    bucket_start: { type: Date, required: true },
    group_key: { type: String, required: true },
    op_key: { type: String, required: true },
    code: { type: String, default: '' },
    path: { type: String, default: '' },
    message: { type: String, default: '' },
    count: { type: Number, default: 0 },
    first_seen_at: { type: Date },
    last_seen_at: { type: Date },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false }
);
errorStatSchema.index({ group_key: 1, bucket_start: 1 }, { unique: true });
errorStatSchema.index({ bucket_start: 1 });
errorStatSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const GraphqlErrorStatModel = model('GraphqlErrorStat', errorStatSchema);

/* ── traces: the slowest sampled request per operation per hour ──────────── */

const traceSchema = new Schema(
  {
    op_key: { type: String, required: true },
    bucket_start: { type: Date, required: true },
    at: { type: Date, required: true },
    duration_ms: { type: Number, required: true },
    parse_ms: { type: Number, default: 0 },
    validate_ms: { type: Number, default: 0 },
    execute_ms: { type: Number, default: 0 },
    client: { type: String, default: '' },
    error_messages: { type: [String], default: [] },
    resolver_count: { type: Number, default: 0 },
    resolvers: { type: Schema.Types.Mixed, default: [] },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false }
);
traceSchema.index({ op_key: 1, bucket_start: 1 }, { unique: true });
traceSchema.index({ op_key: 1, duration_ms: -1 });
traceSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const GraphqlTraceModel = model('GraphqlTrace', traceSchema);
