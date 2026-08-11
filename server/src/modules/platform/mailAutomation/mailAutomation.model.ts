import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Mail automation: a Gmail mailbox that answers itself.
 *
 * Two collections, because the two things have different owners and different
 * lifetimes. The ACCOUNT is the mailbox plus the rule that governs it — Tech
 * connects it, Support writes the rule. The THREAD is one conversation the
 * automation has already answered, and it is the reason a reply on an existing
 * thread does nothing: the gate is "have we seen this thread id", so the second
 * message in a conversation cannot open a second ticket.
 */

/** Which queue an inbound email opens a record in. */
export type MailTicketType = 'SUPPORT' | 'GRIEVANCE' | 'REPORT_PROBLEM';
export const MAIL_TICKET_TYPES: MailTicketType[] = ['SUPPORT', 'GRIEVANCE', 'REPORT_PROBLEM'];

/** The response window quoted in the auto-reply. 24-48 is the default pair. */
export const DEFAULT_SLA_MIN_HOURS = 24;
export const DEFAULT_SLA_MAX_HOURS = 48;

/** What a mailbox says back before anyone has written a rule for it. */
export const DEFAULT_REPLY_TEMPLATE = [
  'Hi {{sender_name}},',
  '',
  'Thanks for writing in. We have logged your message as {{ticket_no}} and our team is on it.',
  'You can expect a reply within {{sla}}.',
  '',
  'Please keep replying on this same email thread so everything stays on one ticket.',
].join('\n');

export interface IMailAutomationAccount extends Document {
  /** The connected mailbox. One rule per address — it is the natural key. */
  email: string;
  display_name: string;
  /** Google's stable account id, so a re-connect updates rather than duplicates. */
  google_sub: string;
  refresh_token: string;
  access_token: string;
  access_token_expires_at: Date | null;
  granted_scopes: string[];
  /** The automation switch. Disconnecting deletes; this only pauses. */
  is_active: boolean;

  // --- the rule, owned by the Support portal ---
  /** "Jab message" — what every first message gets back. Carries {{ticket_no}}. */
  reply_template: string;
  /** Let OpenAI write the actual sentences at send time, from the template. */
  ai_enabled: boolean;
  ticket_type: MailTicketType;
  sla_min_hours: number;
  sla_max_hours: number;

  // --- runtime, owned by the poller ---
  /**
   * Gmail's incremental cursor. Reading forward from it is what makes the poll
   * cheap and, more importantly, what makes it exact: no unread flags to depend
   * on and nothing in the mailbox to mutate just to remember where we were.
   */
  last_history_id: string;
  last_polled_at: Date | null;
  last_error: string;
  connected_by: Types.ObjectId | null;
  connected_at: Date;
  created_at: Date;
  updated_at: Date;
}

const accountSchema = new Schema<IMailAutomationAccount>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    display_name: { type: String, default: '', trim: true, maxlength: 120 },
    google_sub: { type: String, default: '', index: true },
    refresh_token: { type: String, default: '' },
    access_token: { type: String, default: '' },
    access_token_expires_at: { type: Date, default: null },
    granted_scopes: { type: [String], default: [] },
    is_active: { type: Boolean, default: true, index: true },
    reply_template: { type: String, default: DEFAULT_REPLY_TEMPLATE, maxlength: 4000 },
    ai_enabled: { type: Boolean, default: true },
    ticket_type: { type: String, enum: MAIL_TICKET_TYPES, default: 'SUPPORT' },
    sla_min_hours: { type: Number, default: DEFAULT_SLA_MIN_HOURS, min: 1, max: 720 },
    sla_max_hours: { type: Number, default: DEFAULT_SLA_MAX_HOURS, min: 1, max: 720 },
    last_history_id: { type: String, default: '' },
    last_polled_at: { type: Date, default: null },
    last_error: { type: String, default: '', maxlength: 500 },
    connected_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    connected_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const MailAutomationAccountModel = model<IMailAutomationAccount>(
  'MailAutomationAccount',
  accountSchema
);

export interface IMailAutomationThread extends Document {
  /**
   * The MAILBOX, by address — not the account document's id.
   *
   * An operator who reconnects a mailbox (to repair a revoked Google grant,
   * say) gets a new account document with a new `_id`. Keying the dedupe on
   * that id would orphan every conversation the old one had answered, so the
   * next customer reply on a live thread would read as brand new: a second
   * ticket, and a second "thanks for writing in" sent into a conversation a
   * human is already holding. The address survives the reconnect; the id does
   * not.
   */
  mailbox_email: string;
  /** Gmail's thread id — the whole conversation, not one message. */
  gmail_thread_id: string;
  /** The message that opened it, so a re-poll of the same message is a no-op. */
  gmail_message_id: string;
  from_email: string;
  from_name: string;
  subject: string;
  ticket_type: MailTicketType;
  ticket_id: Types.ObjectId | null;
  ticket_no: string;
  /** Whether the acknowledgement actually left. A ticket that was opened but
   * never answered is a different failure from one that was never opened. */
  replied_at: Date | null;
  reply_error: string;
  /** True when OpenAI wrote the body, false when the template was sent as-is. */
  reply_by_ai: boolean;
  created_at: Date;
}

const threadSchema = new Schema<IMailAutomationThread>(
  {
    mailbox_email: { type: String, required: true, lowercase: true, trim: true },
    gmail_thread_id: { type: String, required: true },
    gmail_message_id: { type: String, default: '' },
    from_email: { type: String, default: '', lowercase: true, trim: true },
    from_name: { type: String, default: '', trim: true, maxlength: 160 },
    subject: { type: String, default: '', trim: true, maxlength: 300 },
    ticket_type: { type: String, enum: MAIL_TICKET_TYPES, required: true },
    ticket_id: { type: Schema.Types.ObjectId, default: null },
    ticket_no: { type: String, default: '' },
    replied_at: { type: Date, default: null },
    reply_error: { type: String, default: '', maxlength: 500 },
    reply_by_ai: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// The gate the whole feature turns on: one row per conversation per mailbox.
// Unique rather than merely indexed, so two overlapping polls cannot both
// decide a thread is new and open two tickets for it.
threadSchema.index({ mailbox_email: 1, gmail_thread_id: 1 }, { unique: true });
threadSchema.index({ mailbox_email: 1, created_at: -1 });

export const MailAutomationThreadModel = model<IMailAutomationThread>(
  'MailAutomationThread',
  threadSchema
);
