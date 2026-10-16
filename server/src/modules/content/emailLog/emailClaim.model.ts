import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One row per domain-event email that has been sent about one entity to one
 * address — the email twin of the WhatsApp log's unique slot.
 *
 * `notifyEvent` runs both legs side by side, and only the WhatsApp leg had a
 * duplicate guard. A sweep looks at every entity on three consecutive ticks
 * (its window is three intervals wide so a missed tick cannot skip one), so the
 * pod reminder, the feedback asks and the other swept emails went out up to
 * three times while their WhatsApp twin went once.
 *
 * Claimed BEFORE sending, so two workers racing the same event cannot both
 * send; released when nothing was delivered, so a later trigger can try again.
 * Rows expire after 90 days — far past any sweep window or queue retry.
 */
export interface IEmailClaim extends Document {
  key: string;
  created_at: Date;
}

const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const emailClaimSchema = new Schema<IEmailClaim>(
  {
    key: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

emailClaimSchema.index({ key: 1 }, { unique: true });
emailClaimSchema.index({ created_at: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const EmailClaimModel = mongoose.model<IEmailClaim>('EmailClaim', emailClaimSchema);
