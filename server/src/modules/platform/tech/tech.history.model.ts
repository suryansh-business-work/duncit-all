import { Schema, model, type Types } from 'mongoose';

/**
 * Tech > Server > Info history: what the host looked like, every few minutes,
 * for the last month — and the AI recommendations read from it.
 *
 * Production and staging share one VPS but not one database, so each
 * environment keeps its own history: host CPU, memory and disk read the same
 * machine, latency and traffic are that environment's API only.
 */

/** How many days the charts and the recommendation read. */
export const SERVER_HISTORY_DAYS = 30;

/** Samples outlive the window by a day so the oldest day on the chart is whole. */
export const SERVER_SAMPLE_RETENTION_MS = (SERVER_HISTORY_DAYS + 1) * 86_400_000;

export interface IServerContainerSample {
  name: string;
  cpu_pct: number;
  memory_mb: number;
}

export interface IServerMetricSample {
  _id: Types.ObjectId;
  at: Date;
  cpu_avg_pct: number;
  cpu_peak_pct: number;
  load_avg_5: number;
  memory_pct: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  swap_pct: number;
  disk_pct: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
  rss_mb: number;
  heap_used_mb: number;
  event_loop_p99_ms: number;
  requests: number;
  errors_5xx: number;
  latency_avg_ms: number;
  latency_p95_ms: number;
  latency_max_ms: number;
  containers: IServerContainerSample[];
  expires_at: Date;
}

const containerSchema = new Schema<IServerContainerSample>(
  {
    name: { type: String, required: true },
    cpu_pct: { type: Number, default: 0 },
    memory_mb: { type: Number, default: 0 },
  },
  { _id: false }
);

const sampleSchema = new Schema<IServerMetricSample>(
  {
    at: { type: Date, required: true },
    cpu_avg_pct: { type: Number, default: 0 },
    cpu_peak_pct: { type: Number, default: 0 },
    load_avg_5: { type: Number, default: 0 },
    memory_pct: { type: Number, default: 0 },
    memory_used_bytes: { type: Number, default: 0 },
    memory_total_bytes: { type: Number, default: 0 },
    swap_pct: { type: Number, default: 0 },
    disk_pct: { type: Number, default: 0 },
    disk_used_bytes: { type: Number, default: 0 },
    disk_total_bytes: { type: Number, default: 0 },
    rss_mb: { type: Number, default: 0 },
    heap_used_mb: { type: Number, default: 0 },
    event_loop_p99_ms: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
    errors_5xx: { type: Number, default: 0 },
    latency_avg_ms: { type: Number, default: 0 },
    latency_p95_ms: { type: Number, default: 0 },
    latency_max_ms: { type: Number, default: 0 },
    containers: { type: [containerSchema], default: [] },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false }
);
sampleSchema.index({ at: 1 });
sampleSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const ServerMetricSampleModel = model<IServerMetricSample>('ServerMetricSample', sampleSchema);

/* ── the AI recommendation ───────────────────────────────────────────────── */

export type ServerAdviceGrade = 'HEALTHY' | 'WATCH' | 'ACTION_NEEDED' | 'INCONCLUSIVE';
export type ServerAdviceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IServerAdviceItem {
  title: string;
  detail: string;
  level: ServerAdviceLevel;
}

export interface IServerAdviceDay {
  date: string;
  note: string;
}

export interface IServerAdvice {
  _id: Types.ObjectId;
  grade: ServerAdviceGrade;
  headline: string;
  summary: string;
  trends: IServerAdviceItem[];
  recommendations: IServerAdviceItem[];
  notable_days: IServerAdviceDay[];
  watch_points: string[];
  period_days: number;
  days_with_data: number;
  model: string;
  generated_by: string;
  generated_at: Date;
}

const itemSchema = new Schema<IServerAdviceItem>(
  {
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  },
  { _id: false }
);

const adviceSchema = new Schema<IServerAdvice>(
  {
    grade: { type: String, enum: ['HEALTHY', 'WATCH', 'ACTION_NEEDED', 'INCONCLUSIVE'], required: true },
    headline: { type: String, default: '' },
    summary: { type: String, default: '' },
    trends: { type: [itemSchema], default: [] },
    recommendations: { type: [itemSchema], default: [] },
    notable_days: {
      type: [new Schema<IServerAdviceDay>({ date: String, note: String }, { _id: false })],
      default: [],
    },
    watch_points: { type: [String], default: [] },
    period_days: { type: Number, required: true },
    days_with_data: { type: Number, default: 0 },
    model: { type: String, default: '' },
    generated_by: { type: String, default: '' },
    generated_at: { type: Date, required: true },
  },
  { versionKey: false }
);
adviceSchema.index({ generated_at: -1 });

export const ServerAdviceModel = model<IServerAdvice>('ServerAdvice', adviceSchema);
