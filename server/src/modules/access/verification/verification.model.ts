import { Schema, model, InferSchemaType } from 'mongoose';

/** The verification kinds a user can submit (B22). */
export const VERIFICATION_TYPES = ['IDENTITY', 'ADDRESS', 'EMAIL'] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

// VERIFIED_BY_APP is a derived, terminal status (e.g. EMAIL verified at login).
// It is never stored — only PENDING / APPROVED / REJECTED reach the DB.
export const VERIFICATION_STATUSES = [
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'VERIFIED_BY_APP',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: null, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: null, trim: true },
  },
  { _id: false }
);

// One row per (user, type). The "NOT_SUBMITTED" state is implicit (no row), so
// the stored statuses are only PENDING / APPROVED / REJECTED.
const userVerificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: VERIFICATION_TYPES, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    // IDENTITY uses a document upload; ADDRESS uses the embedded address sub-doc.
    document_url: { type: String, default: null },
    address: { type: addressSchema, default: null },
    reject_reason: { type: String, default: null },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userVerificationSchema.index({ user_id: 1, type: 1 }, { unique: true });

export type UserVerificationDoc = InferSchemaType<typeof userVerificationSchema> & { _id: any };
export const UserVerificationModel = model('UserVerification', userVerificationSchema);
