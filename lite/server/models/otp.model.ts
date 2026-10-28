import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** Who proves the code: Lite's own mailbox, the person's Duncit account, or MSG91 for an SMS. */
export const OTP_VIA = ['LITE', 'DUNCIT', 'SMS'] as const;
export type OtpVia = (typeof OTP_VIA)[number];

/** Signing in, or adding a contact (a phone, or an email) to an account already signed in. */
export const OTP_PURPOSES = ['SIGN_IN', 'LINK'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/**
 * One outstanding code. Exactly one of `email` / `phone` is set. A LITE code
 * is stored hashed like a password; a DUNCIT code is checked by the main API
 * and an SMS code by MSG91 (`req_id` is MSG91's request id), so neither keeps
 * a hash. A LINK code also names the account it is for (`user_id`).
 */
const otpSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true, index: true, default: undefined },
    phone: { type: String, trim: true, index: true, default: undefined },
    via: { type: String, enum: OTP_VIA, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, default: 'SIGN_IN' },
    user_id: { type: Schema.Types.ObjectId, ref: 'LiteUser', default: null },
    code_hash: { type: String, default: '' },
    req_id: { type: String, default: '' },
    expires_at: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
    attempts: { type: Number, default: 0 },
    consumed_at: { type: Date, default: null },
    last_sent_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

otpSchema.index({ email: 1, created_at: -1 });
otpSchema.index({ phone: 1, created_at: -1 });

export type LiteOtp = InferSchemaType<typeof otpSchema>;
export type LiteOtpDoc = HydratedDocument<LiteOtp>;
export const LiteOtpModel = model('LiteOtp', otpSchema, 'lite_otps');
