import { Schema, model, type Document, type Types } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import type { HealthSubjectType } from './accountHealth.model';

/** Why the person says a deduction should be lifted. Mirrors `HealthAppealReason`. */
export const HEALTH_APPEAL_REASONS = ['WONT_HAPPEN_AGAIN', 'INCORRECT'] as const;
export type HealthAppealReason = (typeof HEALTH_APPEAL_REASONS)[number];

/** Where Legal has taken it. Mirrors `HealthAppealStatus`. */
export const HEALTH_APPEAL_STATUSES = ['PENDING', 'ACCEPTED', 'DENIED'] as const;
export type HealthAppealStatus = (typeof HEALTH_APPEAL_STATUSES)[number];

export interface IHealthAppeal extends Document {
  /** The permanent handle: APL-000001. Minted on insert, never reused. */
  appeal_no: string | null;
  adjustment_id: Types.ObjectId;
  subject_type: HealthSubjectType;
  subject_id: Types.ObjectId;
  // The account or venue name when the appeal was filed, so the Legal queue can
  // show and search it without a lookup per row.
  subject_label: string;
  /** Who appealed — the deduction's `subject_user_id`, read from the session. */
  appellant_id: Types.ObjectId;
  // The deduction as it stood when appealed. An admin may edit or delete it
  // later; Legal still decides on what the person actually saw.
  delta: number;
  remark: string;
  adjusted_at: Date;
  reason: HealthAppealReason;
  message: string;
  status: HealthAppealStatus;
  decision_note: string;
  decided_by: Types.ObjectId | null;
  decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const healthAppealSchema = new Schema<IHealthAppeal>(
  {
    appeal_no: { type: String, default: null, unique: true, sparse: true },
    // One appeal per deduction, ever: the unique index is what holds when the
    // same person taps Send twice.
    adjustment_id: { type: Schema.Types.ObjectId, ref: 'HealthAdjustment', required: true, unique: true },
    subject_type: { type: String, enum: ['USER', 'VENUE'], required: true, index: true },
    subject_id: { type: Schema.Types.ObjectId, required: true, index: true },
    subject_label: { type: String, default: '', trim: true, maxlength: 200 },
    appellant_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delta: { type: Number, required: true },
    remark: { type: String, default: '', trim: true, maxlength: 500 },
    adjusted_at: { type: Date, required: true },
    reason: { type: String, enum: HEALTH_APPEAL_REASONS, required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: HEALTH_APPEAL_STATUSES, default: 'PENDING', index: true },
    decision_note: { type: String, default: '', trim: true, maxlength: 1000 },
    decided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decided_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

healthAppealSchema.index({ status: 1, created_at: -1 });

healthAppealSchema.pre('save', async function (next) {
  if (this.isNew && !this.appeal_no) {
    this.appeal_no = await nextEntityNo('APL', 'health_appeal');
  }
  next();
});

export const HealthAppealModel = model<IHealthAppeal>('HealthAppeal', healthAppealSchema);
