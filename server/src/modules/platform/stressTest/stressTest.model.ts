import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * QUEUED   — the portal wrote the row and GitHub accepted the dispatch; no
 *            runner has claimed it yet.
 * RUNNING  — at least one shard has claimed it and is generating load.
 * STOPPING — someone pressed Stop, or a guardrail tripped. The shards read the
 *            flag on their next report and wind down.
 * COMPLETED / ABORTED / FAILED — terminal. ABORTED is a deliberate stop (by a
 *            person or a guardrail), FAILED is the run itself breaking (no
 *            runner, a runner that went silent, a crash).
 */
export type StressRunStatus = 'QUEUED' | 'RUNNING' | 'STOPPING' | 'COMPLETED' | 'ABORTED' | 'FAILED';

export const LIVE_STATUSES: readonly StressRunStatus[] = ['QUEUED', 'RUNNING', 'STOPPING'];

export type StressEventLevel = 'INFO' | 'WARN' | 'ERROR';

/** What a run was asked to do. Capped by the settings when it is created. */
export interface IStressProfile {
  virtual_users: number;
  browser_bots: number;
  runners: number;
  ramp_up_seconds: number;
  hold_seconds: number;
  ramp_down_seconds: number;
  think_time_ms: number;
  journeys: string[];
}

/** One line of the run's log — the timeline a person reads afterwards. */
export interface IStressEvent {
  at: Date;
  level: StressEventLevel;
  source: string;
  message: string;
}

/** Per-endpoint totals, written once by the shards' final report. */
export interface IStressEndpoint {
  key: string;
  requests: number;
  errors: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

/** The worst the run saw — kept on the row so the list needs no samples. */
export interface IStressPeaks {
  virtual_users: number;
  browser_bots: number;
  rps: number;
  p95_ms: number;
  error_rate_pct: number;
  host_cpu_pct: number;
  host_memory_pct: number;
  event_loop_lag_ms: number;
  real_users: number;
}

export interface IStressSummary {
  requests: number;
  errors: number;
  error_rate_pct: number;
  avg_rps: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  navigations: number;
  navigation_errors: number;
  avg_page_load_ms: number;
}

/** How a shard ended. Merged into the run's summary once every shard has reported. */
export interface IStressShardResult {
  shard: number;
  outcome: 'COMPLETED' | 'ABORTED' | 'FAILED';
  error: string;
  summary: IStressSummary;
  endpoints: IStressEndpoint[];
  at: Date;
}

export type StressVerdictGrade = 'HEALTHY' | 'STRAINED' | 'OVERLOADED' | 'INCONCLUSIVE';
export type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** A finding with a weight — a bottleneck, or an upgrade to make. */
export interface IStressVerdictItem {
  title: string;
  detail: string;
  level: StressLevel;
}

/** OpenAI's reading of a finished run: how many users it holds and what to do about it. */
export interface IStressVerdict {
  grade: StressVerdictGrade;
  headline: string;
  safe_concurrent_users: number;
  breaking_point_users: number;
  confidence: StressLevel;
  capacity_reasoning: string;
  bottlenecks: IStressVerdictItem[];
  upgrades: IStressVerdictItem[];
  watch_points: string[];
  model: string;
  generated_by: string;
  generated_at: Date;
}

export interface IStressRun extends Document {
  _id: Types.ObjectId;
  run_no: string;
  status: StressRunStatus;
  environment: string;
  target_mweb_url: string;
  target_graphql_url: string;
  profile: IStressProfile;
  triggered_by: string;
  dispatch_id: string;
  /** sha256 of the key the shards send on every request. The key itself is
   * handed to the runner once, on claim, and never stored. */
  traffic_key_hash: string;
  workflow_run_id: string;
  workflow_run_url: string;
  ref: string;
  started_at: Date | null;
  ended_at: Date | null;
  stop_requested_at: Date | null;
  stop_reason: string;
  /** The host ran out of CPU or memory: the workflow is cancelled if the runners do not stop at once. */
  terminated: boolean;
  last_report_at: Date | null;
  peaks: IStressPeaks;
  summary: IStressSummary | null;
  endpoints: IStressEndpoint[];
  shard_results: IStressShardResult[];
  events: IStressEvent[];
  error_message: string;
  verdict: IStressVerdict | null;
  created_at: Date;
  updated_at: Date;
}

const profileSchema = new Schema<IStressProfile>(
  {
    virtual_users: { type: Number, required: true },
    browser_bots: { type: Number, default: 0 },
    runners: { type: Number, default: 1 },
    ramp_up_seconds: { type: Number, default: 60 },
    hold_seconds: { type: Number, default: 300 },
    ramp_down_seconds: { type: Number, default: 30 },
    think_time_ms: { type: Number, default: 1000 },
    journeys: { type: [String], default: [] },
  },
  { _id: false }
);

const eventSchema = new Schema<IStressEvent>(
  {
    at: { type: Date, required: true },
    level: { type: String, enum: ['INFO', 'WARN', 'ERROR'], default: 'INFO' },
    source: { type: String, default: 'server' },
    message: { type: String, required: true },
  },
  { _id: false }
);

const zeroPeaks = (): IStressPeaks => ({
  virtual_users: 0,
  browser_bots: 0,
  rps: 0,
  p95_ms: 0,
  error_rate_pct: 0,
  host_cpu_pct: 0,
  host_memory_pct: 0,
  event_loop_lag_ms: 0,
  real_users: 0,
});

const stressRunSchema = new Schema<IStressRun>(
  {
    run_no: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'STOPPING', 'COMPLETED', 'ABORTED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    environment: { type: String, required: true },
    target_mweb_url: { type: String, required: true },
    target_graphql_url: { type: String, required: true },
    profile: { type: profileSchema, required: true },
    triggered_by: { type: String, default: '' },
    dispatch_id: { type: String, default: '', index: true },
    traffic_key_hash: { type: String, default: '' },
    workflow_run_id: { type: String, default: '' },
    workflow_run_url: { type: String, default: '' },
    ref: { type: String, default: '' },
    started_at: { type: Date, default: null },
    ended_at: { type: Date, default: null },
    stop_requested_at: { type: Date, default: null },
    stop_reason: { type: String, default: '' },
    terminated: { type: Boolean, default: false },
    last_report_at: { type: Date, default: null },
    peaks: { type: Schema.Types.Mixed, default: zeroPeaks },
    summary: { type: Schema.Types.Mixed, default: null },
    // Mixed rather than a sub-schema: an endpoint carries an `errors` count, and
    // on a Mongoose subdocument `errors` is the reserved validation-errors path.
    endpoints: { type: Schema.Types.Mixed, default: [] },
    shard_results: { type: Schema.Types.Mixed, default: [] },
    events: { type: [eventSchema], default: [] },
    error_message: { type: String, default: '' },
    verdict: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

stressRunSchema.index({ created_at: -1 });

export const StressRunModel = model<IStressRun>('StressRun', stressRunSchema);

/* ── samples: the time series behind the live charts ─────────────────────── */

/** What the shards measured over the last window, summed across shards. */
export interface IStressLoadSample {
  active_vus: number;
  active_bots: number;
  rps: number;
  error_rate_pct: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  requests: number;
  errors: number;
  navigations: number;
  page_load_ms: number;
  status_counts: Record<string, number>;
}

/** What the server under test saw about itself over the same window. */
export interface IStressServerSample {
  host_cpu_pct: number;
  host_memory_pct: number;
  load_avg_1: number;
  event_loop_lag_ms: number;
  heap_used_mb: number;
  rss_mb: number;
  rps_total: number;
  rps_stress: number;
  in_flight: number;
  server_p95_ms: number;
  status_5xx: number;
  sockets: number;
  real_users: number;
  visitors: number;
}

export interface IStressContainerSample {
  name: string;
  cpu_pct: number;
  memory_mb: number;
  memory_pct: number;
}

export interface IStressSample extends Document {
  run_id: Types.ObjectId;
  at: Date;
  load: IStressLoadSample;
  server: IStressServerSample;
  containers: IStressContainerSample[];
  expires_at: Date;
}

const stressSampleSchema = new Schema<IStressSample>({
  run_id: { type: Schema.Types.ObjectId, required: true },
  at: { type: Date, required: true },
  load: { type: Schema.Types.Mixed, required: true },
  server: { type: Schema.Types.Mixed, required: true },
  containers: { type: Schema.Types.Mixed, default: [] },
  // Written per sample from the admin-configured retention, so changing the
  // setting governs new samples without rewriting an index.
  expires_at: { type: Date, required: true },
});

stressSampleSchema.index({ run_id: 1, at: 1 });
stressSampleSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const StressSampleModel = model<IStressSample>('StressSample', stressSampleSchema);

/* ── settings: the ceilings and the guardrails ───────────────────────────── */

export interface IStressSettings extends Document {
  key: string;
  max_virtual_users: number;
  max_browser_bots: number;
  max_runners: number;
  max_duration_minutes: number;
  abort_error_rate_pct: number;
  abort_p95_ms: number;
  abort_host_cpu_pct: number;
  abort_host_memory_pct: number;
  abort_breach_samples: number;
  sample_retention_days: number;
  created_at: Date;
  updated_at: Date;
}

const stressSettingsSchema = new Schema<IStressSettings>(
  {
    key: { type: String, required: true, unique: true },
    // Deliberately modest. The singleton is created by the first read, and a
    // generous ceiling is one mistyped number away from taking production down.
    max_virtual_users: { type: Number, default: 500 },
    max_browser_bots: { type: Number, default: 10 },
    max_runners: { type: Number, default: 4 },
    max_duration_minutes: { type: Number, default: 30 },
    abort_error_rate_pct: { type: Number, default: 25 },
    abort_p95_ms: { type: Number, default: 8000 },
    abort_host_cpu_pct: { type: Number, default: 95 },
    abort_host_memory_pct: { type: Number, default: 95 },
    abort_breach_samples: { type: Number, default: 3 },
    sample_retention_days: { type: Number, default: 30 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StressSettingsModel = model<IStressSettings>('StressSettings', stressSettingsSchema);

export const STRESS_SETTINGS_KEY = 'stress_test';

interface IStressRunCounter extends Document {
  singleton_key: string;
  seq: number;
}

const stressRunCounterSchema = new Schema<IStressRunCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const StressRunCounterModel = model<IStressRunCounter>('StressRunCounter', stressRunCounterSchema);

/** Next globally unique run id, e.g. `DUN-STR-000001` — never reused. */
export async function nextStressRunNo(): Promise<string> {
  const doc = await StressRunCounterModel.findOneAndUpdate(
    { singleton_key: 'stress_run' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `DUN-STR-${String(doc.seq).padStart(6, '0')}`;
}
