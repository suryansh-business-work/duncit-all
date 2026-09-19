import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * One outstanding sign-in code, stored hashed like a password. `via` records
 * which service is proving the email: Lite's own mailbox, or the person's
 * Duncit account (in which case the code came from the main API and is checked
 * there, so `code_hash` is empty).
 */
const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    via: { type: String, enum: ['LITE', 'DUNCIT'], required: true },
    code_hash: { type: String, default: '' },
    expires_at: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
    attempts: { type: Number, default: 0 },
    consumed_at: { type: Date, default: null },
    last_sent_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

otpSchema.index({ email: 1, created_at: -1 });

export type LiteOtp = InferSchemaType<typeof otpSchema>;
export type LiteOtpDoc = HydratedDocument<LiteOtp>;
export const LiteOtpModel = model('LiteOtp', otpSchema, 'lite_otps');
