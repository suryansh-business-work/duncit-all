import { Schema, model, type Types } from 'mongoose';

/**
 * Per-person, per-day counters for the role quotas (messages and tokens per
 * day). One row per (user, day), bumped with an atomic $inc — never read,
 * added to and written back, so parallel messages cannot undercount.
 */
export interface IAskDuncitUsage {
  _id: Types.ObjectId;
  user_id: string;
  day: string;
  messages: number;
  tokens: number;
  updated_at: Date;
}

const usageSchema = new Schema<IAskDuncitUsage>(
  {
    user_id: { type: String, required: true },
    day: { type: String, required: true },
    messages: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

usageSchema.index({ user_id: 1, day: 1 }, { unique: true });
// Counters older than 90 days are of no use to a daily quota.
usageSchema.index({ updated_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AskDuncitUsageModel = model<IAskDuncitUsage>('AskDuncitUsage', usageSchema);
