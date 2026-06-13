import { Schema, model, InferSchemaType } from 'mongoose';

/** The verification kinds a user can submit (B2-#9). */
export const VERIFICATION_TYPES = [
  'IDENTITY',
  'ADDRESS',
  'PHONE',
  'EMAIL',
  'BANK_ACCOUNT',
  'POLICE',
  'SELFIE',
] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// One row per (user, type). The "NOT_SUBMITTED" state is implicit (no row), so
// the stored statuses are only PENDING / APPROVED / REJECTED.
const userVerificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: VERIFICATION_TYPES, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    document_url: { type: String, default: null },
    reject_reason: { type: String, default: null },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userVerificationSchema.index({ user_id: 1, type: 1 }, { unique: true });

export type UserVerificationDoc = InferSchemaType<typeof userVerificationSchema> & { _id: any };
export const UserVerificationModel = model('UserVerification', userVerificationSchema);
