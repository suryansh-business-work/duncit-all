import mongoose, { Schema, type Types } from 'mongoose';

/**
 * One row per WhatsApp message Duncit tried to send on its own.
 *
 * Separate from `WaCampaignRecipient` on purpose: that collection belongs to a
 * marketing blast and is keyed by the campaign document that spawned it. A
 * transactional send has no campaign document — it has a domain event and the
 * thing the event happened to — so a row here answers the question support
 * actually asks: "why didn't this person get their cancellation message?"
 *
 * SKIPPED is the common, healthy outcome (no number, switched off, opted out)
 * and is recorded with its reason rather than silently dropped, because "we
 * never tried" and "we tried and it failed" are different bugs.
 */
export const WA_MESSAGE_STATUSES = ['SENDING', 'SENT', 'SKIPPED', 'FAILED'] as const;
export type WaMessageStatus = (typeof WA_MESSAGE_STATUSES)[number];

export interface IWaMessageLog {
  _id: Types.ObjectId;
  /** The registry key, never the campaign name — renaming a campaign at AiSensy
   * must not orphan the history. */
  event_key: string;
  campaign: string;
  /** Our consent category (billing, reminder, …), not Meta's. */
  category: string;
  audience: string;
  /** The pod / release / ticket the message is about. Empty for account-level
   * messages, which are already unique per recipient. */
  entity_id: string;
  recipient_user_id: Types.ObjectId | null;
  destination: string;
  status: WaMessageStatus;
  /** Why it was skipped or how it failed. Empty on a clean send. */
  reason: string;
  params: string[];
  submitted_message_id: string;
  /** Meta's category at send time, which is what the rate was read from. */
  template_category: string;
  /** The per-message rate frozen at send time, so a later price change never
   * rewrites what this message cost. */
  msg_rate: number;
  duration_ms: number;
  /**
   * Whether this row occupies the one-message-per-event-per-recipient slot.
   *
   * SENDING and SENT do; FAILED and SKIPPED do not, so a genuine re-trigger can
   * try again after an AiSensy outage. It is a flag rather than a status test
   * because a Mongo partial index cannot express `$in`.
   */
  holds_slot: boolean;
  created_at: Date;
  updated_at: Date;
}

const waMessageLogSchema = new Schema<IWaMessageLog>(
  {
    event_key: { type: String, required: true, index: true },
    campaign: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    audience: { type: String, default: '' },
    entity_id: { type: String, default: '' },
    recipient_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    destination: { type: String, default: '' },
    status: { type: String, enum: WA_MESSAGE_STATUSES, required: true, index: true },
    reason: { type: String, default: '' },
    params: { type: [String], default: [] },
    submitted_message_id: { type: String, default: '' },
    template_category: { type: String, default: '' },
    msg_rate: { type: Number, default: 0 },
    duration_ms: { type: Number, default: 0 },
    holds_slot: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

/**
 * THE idempotency. A duplicate key on insert is how the funnel learns the
 * message already went — no read-then-write, so two workers racing the same
 * event cannot both pass a check and both send.
 *
 * `boot` must run `syncIndexes` for this to exist on an already-deployed
 * database; without the index every re-trigger is a second billed message.
 */
waMessageLogSchema.index(
  { event_key: 1, entity_id: 1, destination: 1 },
  { unique: true, partialFilterExpression: { holds_slot: true } }
);

// The console reads newest-first, filtered by status.
waMessageLogSchema.index({ created_at: -1 });
waMessageLogSchema.index({ status: 1, created_at: -1 });

export const WaMessageLogModel =
  (mongoose.models.WaMessageLog as mongoose.Model<IWaMessageLog>) ||
  mongoose.model<IWaMessageLog>('WaMessageLog', waMessageLogSchema);
