import { Schema, model, type Document } from 'mongoose';
import {
  RATE_LIMIT_ALGORITHMS,
  RATE_LIMIT_AUDIENCES,
  RATE_LIMIT_KEYS,
  RATE_LIMIT_MODES,
  RATE_LIMIT_OPERATION_TYPES,
  RATE_LIMIT_SURFACES,
  type RateLimitAlgorithm,
  type RateLimitAudience,
  type RateLimitChannel,
  type RateLimitKeyBy,
  type RateLimitMode,
  type RateLimitOperationType,
  type RateLimitSurface,
} from './rateLimit.types';

/**
 * Rate limiting: the rules, the master settings, the systems that have been
 * seen calling, and the breaches worth showing somebody.
 *
 * Four collections rather than one document, because they change at four
 * different rates: rules are edited by hand and read on every request (cached),
 * settings are one row, systems are written by traffic, and events are a
 * high-churn log with a TTL.
 *
 * This file is coverage-excluded (`*.model.ts`), so the lazy create-if-missing
 * singleton read lives here, as it does for telemetry and finance.
 */

const CHANNELS = ['GRAPHQL', 'REST', 'SOCKET', 'ALL'] as const;

/* --------------------------------- rules --------------------------------- */

export interface IRateLimitRule extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  /** ENFORCE refuses the request; MONITOR only records the breach. */
  mode: RateLimitMode;
  /** Lower runs first; every matching rule is still evaluated. */
  priority: number;

  /* --- what traffic it governs --- */
  surface: RateLimitSurface | 'ALL';
  /** Portal/app key, or the wildcard for every app on that surface. */
  app: string;
  channel: RateLimitChannel | 'ALL';
  audience: RateLimitAudience;
  /** GraphQL field names; wildcard entries match anything. Empty = every field. */
  operations: string[];
  operation_type: RateLimitOperationType;
  /** REST path globs. Empty = every path. */
  paths: string[];
  /** HTTP methods. Empty = every method. */
  methods: string[];

  /* --- the allowance --- */
  key_by: RateLimitKeyBy;
  algorithm: RateLimitAlgorithm;
  limit: number;
  window_seconds: number;
  /** TOKEN_BUCKET only: requests allowed above the limit in one burst. */
  burst: number;
  /** Cool-off after a breach. 0 = the window alone is the penalty. */
  block_seconds: number;

  /* --- who it never applies to --- */
  exempt_roles: string[];
  exempt_ips: string[];

  /* --- what the caller is told --- */
  message?: string;
  notify_slack: boolean;

  /* --- counters, written by traffic --- */
  hit_count: number;
  blocked_count: number;
  last_hit_at?: Date;
  last_blocked_at?: Date;

  created_at: Date;
  updated_at: Date;
}

const rateLimitRuleSchema = new Schema<IRateLimitRule>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: RATE_LIMIT_MODES, default: 'ENFORCE' },
    priority: { type: Number, default: 100, min: 0, max: 10000 },

    surface: { type: String, enum: [...RATE_LIMIT_SURFACES, 'ALL'], default: 'ALL' },
    app: { type: String, default: '*', trim: true },
    channel: { type: String, enum: CHANNELS, default: 'ALL' },
    audience: { type: String, enum: RATE_LIMIT_AUDIENCES, default: 'ALL' },
    operations: { type: [String], default: [] },
    operation_type: { type: String, enum: RATE_LIMIT_OPERATION_TYPES, default: 'ALL' },
    paths: { type: [String], default: [] },
    methods: { type: [String], default: [] },

    key_by: { type: String, enum: RATE_LIMIT_KEYS, default: 'IP' },
    algorithm: { type: String, enum: RATE_LIMIT_ALGORITHMS, default: 'SLIDING_WINDOW' },
    limit: { type: Number, required: true, min: 1, max: 1000000 },
    window_seconds: { type: Number, required: true, min: 1, max: 86400 },
    burst: { type: Number, default: 0, min: 0, max: 1000000 },
    block_seconds: { type: Number, default: 0, min: 0, max: 86400 },

    exempt_roles: { type: [String], default: [] },
    exempt_ips: { type: [String], default: [] },

    message: { type: String, trim: true },
    notify_slack: { type: Boolean, default: false },

    hit_count: { type: Number, default: 0 },
    blocked_count: { type: Number, default: 0 },
    last_hit_at: { type: Date },
    last_blocked_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// The enforcer loads the whole enabled set in priority order on every refresh.
rateLimitRuleSchema.index({ enabled: 1, priority: 1 });
// One rule per name, so a re-seed cannot quietly create a second copy of a
// shipped default that an operator has already tuned.
rateLimitRuleSchema.index({ name: 1 }, { unique: true });

export const RateLimitRuleModel = model<IRateLimitRule>('RateLimitRule', rateLimitRuleSchema);

/* -------------------------------- settings -------------------------------- */

export interface IRateLimitSettings extends Document {
  singleton_key: string;
  /** Master switch. Off = every request passes, whatever the rules say. */
  enabled: boolean;
  /** Forces every rule to MONITOR without editing any of them. */
  monitor_only: boolean;
  /** Shown when a rule carries no message of its own. */
  default_message: string;
  /** Send the X-RateLimit-* headers and Retry-After. */
  send_headers: boolean;
  /** Write a warn line for every refusal. */
  log_blocks: boolean;
  /** Post refusals to Slack (each rule opts in as well). */
  notify_slack: boolean;
  /** Never limited, whatever a rule says — on top of each rule's own list. */
  exempt_roles: string[];
  /** Always allowed (office egress, monitoring probes). */
  allow_ips: string[];
  /** Refused before any rule is consulted. */
  block_ips: string[];
  /** Days a breach event is kept (1..90). */
  event_retention_days: number;
  created_at: Date;
  updated_at: Date;
}

const rateLimitSettingsSchema = new Schema<IRateLimitSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'rate-limit' },
    enabled: { type: Boolean, default: true },
    monitor_only: { type: Boolean, default: false },
    default_message: {
      type: String,
      default: 'Too many requests. Please slow down and try again shortly.',
    },
    send_headers: { type: Boolean, default: true },
    log_blocks: { type: Boolean, default: true },
    notify_slack: { type: Boolean, default: false },
    exempt_roles: { type: [String], default: ['SUPER_ADMIN'] },
    allow_ips: { type: [String], default: [] },
    block_ips: { type: [String], default: [] },
    event_retention_days: { type: Number, default: 7, min: 1, max: 90 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const RateLimitSettingsModel = model<IRateLimitSettings>(
  'RateLimitSettings',
  rateLimitSettingsSchema,
);

/** Lazy read of the singleton, created on first access like telemetry's. */
export async function getRateLimitSettingsDoc(): Promise<IRateLimitSettings> {
  const existing = await RateLimitSettingsModel.findOne({ singleton_key: 'rate-limit' });
  if (existing) return existing;
  return RateLimitSettingsModel.create({ singleton_key: 'rate-limit' });
}

/* -------------------------------- systems --------------------------------- */

/**
 * One row per (surface, app) pair the server has actually been called by.
 *
 * The console lists these rather than a hardcoded catalogue, so a portal added
 * next month appears on the Systems page the first time it calls — nobody has
 * to remember to register it. The shipped seed only makes the page non-empty
 * on a fresh database.
 */
export interface IRateLimitSystem extends Document {
  surface: RateLimitSurface;
  app: string;
  /** Human label, from the seed; falls back to the app key for a new one. */
  label: string;
  requests: number;
  blocked: number;
  last_seen_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const rateLimitSystemSchema = new Schema<IRateLimitSystem>(
  {
    surface: { type: String, enum: RATE_LIMIT_SURFACES, required: true },
    app: { type: String, required: true },
    label: { type: String, default: '' },
    requests: { type: Number, default: 0 },
    blocked: { type: Number, default: 0 },
    last_seen_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

rateLimitSystemSchema.index({ surface: 1, app: 1 }, { unique: true });

export const RateLimitSystemModel = model<IRateLimitSystem>(
  'RateLimitSystem',
  rateLimitSystemSchema,
);

/* --------------------------------- events --------------------------------- */

export interface IRateLimitEvent extends Document {
  rule_id: string;
  rule_name: string;
  mode: RateLimitMode;
  surface: RateLimitSurface;
  app: string;
  channel: RateLimitChannel;
  operation?: string;
  path?: string;
  method?: string;
  /** The counter key that overflowed, as its kind plus its value. */
  limit_key: string;
  key_by: RateLimitKeyBy;
  ip?: string;
  user_id?: string;
  user_email?: string;
  device_id?: string;
  user_agent?: string;
  count: number;
  limit: number;
  retry_after: number;
  created_at: Date;
}

const rateLimitEventSchema = new Schema<IRateLimitEvent>({
  rule_id: { type: String, required: true },
  rule_name: { type: String, required: true },
  mode: { type: String, enum: RATE_LIMIT_MODES, required: true },
  surface: { type: String, required: true },
  app: { type: String, required: true },
  channel: { type: String, required: true },
  operation: { type: String },
  path: { type: String },
  method: { type: String },
  limit_key: { type: String, required: true },
  key_by: { type: String, required: true },
  ip: { type: String },
  user_id: { type: String },
  user_email: { type: String },
  device_id: { type: String },
  user_agent: { type: String },
  count: { type: Number, default: 0 },
  limit: { type: Number, default: 0 },
  retry_after: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

rateLimitEventSchema.index({ created_at: -1 });
rateLimitEventSchema.index({ rule_id: 1, created_at: -1 });
rateLimitEventSchema.index({ surface: 1, app: 1, created_at: -1 });
// Hard ceiling. The admin retention window (event_retention_days) is shorter
// and enforced by the cleanup pass; this is the net if that never runs.
rateLimitEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const RateLimitEventModel = model<IRateLimitEvent>('RateLimitEvent', rateLimitEventSchema);
