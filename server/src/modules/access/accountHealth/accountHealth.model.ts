import { Schema, model, Types, type Document } from 'mongoose';

export type HealthSubjectType = 'USER' | 'VENUE';

export interface IHealthAdjustment extends Document {
  subject_type: HealthSubjectType;
  // For USER adjustments, subject_id is the user's _id. For VENUE, the venue doc _id.
  subject_id: Types.ObjectId;
  // The user impacted by this adjustment: equals subject_id when type is USER,
  // and equals the venue's owner_user_id when type is VENUE.
  subject_user_id: Types.ObjectId;
  delta: number;
  remark: string;
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const healthAdjustmentSchema = new Schema<IHealthAdjustment>(
  {
    subject_type: { type: String, enum: ['USER', 'VENUE'], required: true, index: true },
    subject_id: { type: Schema.Types.ObjectId, required: true, index: true },
    subject_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delta: { type: Number, required: true, min: -100, max: 100 },
    remark: { type: String, required: false, default: '', trim: true, maxlength: 500 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

healthAdjustmentSchema.index({ subject_type: 1, subject_id: 1, created_at: -1 });

export const HealthAdjustmentModel = model<IHealthAdjustment>(
  'HealthAdjustment',
  healthAdjustmentSchema
);
