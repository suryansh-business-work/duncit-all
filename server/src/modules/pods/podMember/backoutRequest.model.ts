import { Schema, model, Types, type Document } from 'mongoose';

/**
 * One record per "Confirm Backout" — the unit the Finance portal's Backout
 * Refunds page lists. Requests are immutable audit rows: status moves
 * IN_PROCESS → CANCELLED (user kept their spot) or IN_PROCESS → SPOT_FILLED
 * (a replacement booked the released seat; refund becomes eligible), and every
 * transition is appended to the `events` timeline — events are never edited
 * or removed.
 */
export type BackoutStatus = 'IN_PROCESS' | 'CANCELLED' | 'SPOT_FILLED';
export const BACKOUT_STATUSES: BackoutStatus[] = ['IN_PROCESS', 'CANCELLED', 'SPOT_FILLED'];

export interface IBackoutEvent {
  status: BackoutStatus;
  /** The user's backout-attempt count for this pod when the event happened. */
  backout_count: number;
  at: Date;
}

export interface IBackoutRequest extends Document {
  /** Permanent, globally unique human-readable id (DUN-BKO-000001). */
  backout_no: string;
  pod_id: Types.ObjectId;
  user_id: Types.ObjectId;
  member_id: Types.ObjectId;
  payment_id: Types.ObjectId | null;
  /** 1-based backout attempt for this user+pod (each request = one attempt). */
  attempt_no: number;
  status: BackoutStatus;
  /** Refund snapshot taken at request time (what the user was shown). */
  payment_amount: number | null;
  deduction_pct: number;
  refund_amount: number | null;
  /** Set once Finance processes the refund — one refund per request. */
  refund_processed_at: Date | null;
  events: IBackoutEvent[];
  created_at: Date;
  updated_at: Date;
}

const backoutEventSchema = new Schema<IBackoutEvent>(
  {
    status: { type: String, enum: BACKOUT_STATUSES, required: true },
    backout_count: { type: Number, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const backoutRequestSchema = new Schema<IBackoutRequest>(
  {
    backout_no: { type: String, required: true, unique: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member_id: { type: Schema.Types.ObjectId, ref: 'PodMember', required: true, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    attempt_no: { type: Number, required: true, min: 1 },
    status: { type: String, enum: BACKOUT_STATUSES, default: 'IN_PROCESS', index: true },
    payment_amount: { type: Number, default: null },
    deduction_pct: { type: Number, default: 0 },
    refund_amount: { type: Number, default: null },
    refund_processed_at: { type: Date, default: null },
    events: { type: [backoutEventSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Attempt counting + "oldest in-process request for a pod" lookups.
backoutRequestSchema.index({ pod_id: 1, user_id: 1, created_at: -1 });
backoutRequestSchema.index({ pod_id: 1, status: 1, created_at: 1 });

export const BackoutRequestModel = model<IBackoutRequest>('BackoutRequest', backoutRequestSchema);

// Atomic sequential counter for backout ids (pattern: MeetingRequestCounter).
interface IBackoutCounter extends Document {
  singleton_key: string;
  seq: number;
}

const backoutCounterSchema = new Schema<IBackoutCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const BackoutCounterModel = model<IBackoutCounter>('BackoutRequestCounter', backoutCounterSchema);

/** Next globally unique backout id, e.g. `DUN-BKO-000001` — never reused. */
export async function nextBackoutNo(): Promise<string> {
  const doc = await BackoutCounterModel.findOneAndUpdate(
    { singleton_key: 'backout_request' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `DUN-BKO-${String(doc.seq).padStart(6, '0')}`;
}
