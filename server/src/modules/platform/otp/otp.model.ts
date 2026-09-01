import { Schema, model, Types, type Document } from 'mongoose';

/** How a one-time code reaches the person it is proving. */
export const OTP_MEDIUMS = ['SMS', 'WHATSAPP', 'EMAIL'] as const;
export type OtpMedium = (typeof OTP_MEDIUMS)[number];

/** The mediums that address a phone number rather than a mailbox. */
export const isPhoneMedium = (medium: OtpMedium): boolean => medium !== 'EMAIL';

/**
 * What a challenge is proving.
 *
 * A purpose is not decoration: `verifyLatest` resolves a code against the
 * newest LIVE challenge for a phone number, so a signup code and an attendance
 * code for the same number must never be able to satisfy each other.
 */
export const OTP_PURPOSES = [
  'ATTENDANCE',
  'WHATSAPP_SIGNUP',
  // Changing the contact number on an account that already exists. Separate
  // from WHATSAPP_SIGNUP so a code minted during onboarding can never be spent
  // to move the number on a live account, and separate from each other so the
  // code proving a contact number cannot move the WhatsApp one instead.
  'PHONE_CHANGE',
  'WHATSAPP_CHANGE',
  // Recovering a forgotten password, on either channel. The ONE purpose that
  // can be addressed to a mailbox as well as to a number — which is why the
  // challenge below carries an `email` alongside the phone pair.
  'PASSWORD_RESET',
] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/** What happened when one medium was asked to carry a code. */
export const OTP_DELIVERY_STATUSES = ['SENT', 'STUBBED', 'FAILED'] as const;
export type OtpDeliveryStatus = (typeof OTP_DELIVERY_STATUSES)[number];

export interface IOtpDelivery {
  medium: OtpMedium;
  status: OtpDeliveryStatus;
  /** Why it was not really sent — blank on a genuine send. */
  reason: string;
}

/**
 * One outstanding one-time code.
 *
 * The code is stored HASHED, exactly as a password would be: a challenge row is
 * readable by anything with database access, and a plaintext code there is the
 * whole verification given away.
 */
export interface IOtpChallenge extends Document {
  purpose: OtpPurpose;
  /** Every medium the caller asked for — the request fans out to all of them. */
  mediums: OtpMedium[];
  deliveries: IOtpDelivery[];
  phone_extension: string;
  phone_number: string;
  /**
   * The mailbox this challenge is addressed to, '' when it is addressed to a
   * number. Exactly one of the two identifies a challenge — see `otpTargetKey`.
   */
  email: string;
  /** The name being proven alongside the number, '' when only the number is. */
  recipient_name: string;
  code_hash: string;
  /**
   * The sha256 of the one-shot grant minted when the code was accepted.
   *
   * Verifying and spending are two different moments for a password reset —
   * the code is checked, then the new password is typed — and the step between
   * them must not be re-openable by anybody who can guess an ObjectId. `''`
   * until a grant is minted, and select:false because it is a credential.
   */
  grant_hash: string;
  expires_at: Date;
  attempts: number;
  verified_at: Date | null;
  /** Stamped when the flow that asked for the proof actually used it. A
   * verified challenge is single-use, or one OTP would mark a whole roster. */
  consumed_at: Date | null;
  /** Rate-limit anchor: when the last code for this challenge went out. */
  last_sent_at: Date;
  /** Whatever the purpose needs to bind the proof to (pod + membership ids). */
  context: Record<string, unknown>;
  requested_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const deliverySchema = new Schema<IOtpDelivery>(
  {
    medium: { type: String, enum: OTP_MEDIUMS, required: true },
    status: { type: String, enum: OTP_DELIVERY_STATUSES, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const otpChallengeSchema = new Schema<IOtpChallenge>(
  {
    purpose: { type: String, enum: OTP_PURPOSES, required: true, index: true },
    mediums: [{ type: String, enum: OTP_MEDIUMS }],
    deliveries: { type: [deliverySchema], default: [] },
    phone_extension: { type: String, default: '' },
    phone_number: { type: String, default: '', index: true },
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    recipient_name: { type: String, default: '' },
    code_hash: { type: String, required: true },
    grant_hash: { type: String, default: '', select: false },
    // Mongo's TTL monitor drops the row an hour AFTER it expires rather than on
    // the dot, so a just-expired challenge can still answer "that code has
    // expired" instead of the misleading "no such challenge".
    expires_at: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
    attempts: { type: Number, default: 0 },
    verified_at: { type: Date, default: null },
    consumed_at: { type: Date, default: null },
    last_sent_at: { type: Date, default: () => new Date() },
    context: { type: Schema.Types.Mixed, default: {} },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// `verifyLatest` reads the newest live challenge for a purpose + destination.
otpChallengeSchema.index({ purpose: 1, phone_number: 1, created_at: -1 });
otpChallengeSchema.index({ purpose: 1, email: 1, created_at: -1 });

export const OtpChallengeModel = model<IOtpChallenge>('OtpChallenge', otpChallengeSchema);
