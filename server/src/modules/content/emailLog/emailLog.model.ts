import mongoose, { Schema, type Document } from 'mongoose';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * One row for every email the product tries to send — including the ones it
 * decides NOT to send.
 *
 * The question this exists to answer is "why did this person not get their
 * email?", and the expensive version of that question is the one with no
 * record at all: a template switched off, a recipient with no address, a
 * provider that refused. Those never reach a mail server, so a provider's own
 * dashboard cannot show them. They are logged here.
 *
 * Separate from `communicationLog`, which is CRM-lead scoped — its `entity_type`
 * is required and enumerates the three lead kinds, so a signup receipt has
 * nowhere to sit in it.
 */

export const EMAIL_LOG_STATUSES = [
  /** Handed to a provider, which accepted it. */
  'SENT',
  /** Deliberately not sent — a disabled template, a suppressed address. */
  'SKIPPED',
  /** Tried and failed: no recipient, no provider, a refusal, a render error. */
  'FAILED',
] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

/**
 * Where the send came from. Not the recipient's device — the surface whose
 * action caused it, which is what an operator asks about ("are the app's
 * signup emails going out?").
 */
export const EMAIL_LOG_SOURCES = [
  'SERVER',
  'NATIVE',
  'MWEB',
  'WEBSITE',
  'PORTAL',
  'CRM',
  'TEST',
] as const;
export type EmailLogSource = (typeof EMAIL_LOG_SOURCES)[number];

export interface IEmailLog extends Document {
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  /** The template slug, when the send used one. Empty for a raw HTML send. */
  template: string;
  /** The header/footer fragment the template named, if any. */
  fragment_key: string | null;
  category: string;
  status: EmailLogStatus;
  /**
   * Why, in one line, whenever the status is not SENT. This is the column an
   * operator actually reads.
   */
  reason: string;
  /**
   * Which provider carried it — `smtp`, or none when it never left. Kept a free
   * string, not an enum: rows written before Resend was removed still say
   * `resend`, and history has to stay readable.
   */
  provider: string;
  /** The provider's own id, for tracing a delivery complaint back to them. */
  message_id: string;
  source: EmailLogSource;
  /** The portal or app that triggered it, when known (e.g. "onboarding"). */
  source_detail: string;
  /** Milliseconds spent on the attempt, so a slow provider is visible. */
  duration_ms: number;
  /**
   * The exact body handed to the provider, for the row's preview.
   *
   * Stored rendered, not as a template reference: a template is edited, and the
   * point of looking at a two-week-old row is to see what THAT person received,
   * not what the template says today. Capped, because a campaign body is
   * measured in tens of kilobytes and there is one row per batch.
   */
  html: string;
  /** The variables it rendered with, as JSON. Empty for a raw-HTML send. */
  vars: string;
  created_at: Date;
  updated_at: Date;
}

/** Past this the body is truncated — a preview, not an archive. */
export const EMAIL_LOG_HTML_LIMIT = 256_000;

const emailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, default: '', index: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    subject: { type: String, default: '' },
    template: { type: String, default: '', index: true },
    fragment_key: { type: String, default: null },
    category: { type: String, default: 'transactional', enum: EMAIL_CATEGORIES, index: true },
    status: { type: String, enum: EMAIL_LOG_STATUSES, required: true, index: true },
    reason: { type: String, default: '' },
    provider: { type: String, default: '' },
    message_id: { type: String, default: '' },
    source: { type: String, enum: EMAIL_LOG_SOURCES, default: 'SERVER', index: true },
    source_detail: { type: String, default: '' },
    duration_ms: { type: Number, default: 0 },
    html: { type: String, default: '' },
    vars: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The table's default view is "newest first", and its filters are status and
// category — this is the index that view reads.
emailLogSchema.index({ created_at: -1 });
emailLogSchema.index({ status: 1, created_at: -1 });
// The template column is read two ways and both are this index: the table
// narrowed to one slug newest-first — where a template's send count links to —
// and the per-template roll-up that produces that count.
emailLogSchema.index({ template: 1, created_at: -1 });

export const EmailLogModel =
  (mongoose.models.EmailLog as mongoose.Model<IEmailLog>) ||
  mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
