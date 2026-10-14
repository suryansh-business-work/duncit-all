import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Reacher's four verdicts, renamed for the people reading them: `safe` is a
 * mailbox that answered, so the CRM calls it VERIFIED. An email that was never
 * checked has no row at all — the portal shows it as "Not checked".
 */
export const EMAIL_STATUSES = ['VERIFIED', 'RISKY', 'INVALID', 'UNKNOWN'] as const;
export type EmailVerificationStatus = (typeof EMAIL_STATUSES)[number];

/** SINGLE: one address typed or clicked in the CRM; BULK: a row of an uploaded CSV. */
export const EMAIL_CHECK_SOURCES = ['SINGLE', 'BULK'] as const;
export type EmailCheckSource = (typeof EMAIL_CHECK_SOURCES)[number];

/**
 * One check of one address — the record kept for every verification. History,
 * not a cache: re-checking an address adds a row, and the newest row is the
 * status shown beside that email everywhere in the CRM.
 */
const emailVerificationSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: EMAIL_STATUSES, required: true, index: true },
    is_valid_syntax: { type: Boolean, default: false },
    accepts_mail: { type: Boolean, default: false },
    can_connect_smtp: { type: Boolean, default: false },
    is_deliverable: { type: Boolean, default: false },
    is_catch_all: { type: Boolean, default: false },
    has_full_inbox: { type: Boolean, default: false },
    is_disabled: { type: Boolean, default: false },
    is_disposable: { type: Boolean, default: false },
    is_role_account: { type: Boolean, default: false },
    /** Reacher's "did you mean" for a likely typo, e.g. gmial.com → gmail.com. */
    suggestion: { type: String, default: '' },
    source: { type: String, enum: EMAIL_CHECK_SOURCES, required: true, index: true },
    /** BULK only: the background job that checked it. */
    job_id: { type: String, default: null, index: true },
    checked_by: {
      id: { type: String, required: true },
      email: { type: String, default: '' },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Latest status per address: match on email, newest first.
emailVerificationSchema.index({ email: 1, created_at: -1 });
emailVerificationSchema.index({ created_at: -1 });

export type EmailVerificationDoc = InferSchemaType<typeof emailVerificationSchema> & {
  _id: Types.ObjectId;
  created_at: Date;
};
export const EmailVerificationModel = model('CrmEmailVerification', emailVerificationSchema);
