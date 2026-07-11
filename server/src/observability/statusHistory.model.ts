import { Schema, model, type Document } from 'mongoose';

/** One probe result for one monitored service, written every scheduler sweep. */
export interface IStatusCheck extends Document {
  service_key: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: Date;
}

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

const schema = new Schema<IStatusCheck>(
  {
    service_key: { type: String, required: true, index: true, trim: true },
    ok: { type: Boolean, required: true },
    status_code: { type: Number, default: null },
    latency_ms: { type: Number, default: null },
    checked_at: { type: Date, required: true },
  },
  { timestamps: false }
);

schema.index({ service_key: 1, checked_at: -1 });
// Retention: Mongo's TTL monitor drops checks older than 90 days.
schema.index({ checked_at: 1 }, { expireAfterSeconds: NINETY_DAYS_SECONDS });

export const StatusCheckModel = model<IStatusCheck>('StatusCheck', schema);
