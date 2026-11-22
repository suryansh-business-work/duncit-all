import { Schema, model, type Document } from 'mongoose';

/**
 * Every Razorpay webhook delivery we accepted, keyed by Razorpay's own event id
 * (`x-razorpay-event-id`) so a redelivery is recognised and never applied twice.
 * The payload is a SUMMARY (ids, status, amount, error) — never the raw body,
 * which carries the buyer's card, email and phone.
 */
export interface IRazorpayWebhookEvent extends Document {
  event_id: string;
  event: string;
  summary: Record<string, string | number | null>;
  received_at: Date;
  processed_at: Date | null;
  /** Empty when handled (or deliberately ignored); the failure message otherwise. */
  error: string;
  /** IGNORED for an event type or a payment this system does not act on. */
  outcome: string;
}

const razorpayWebhookEventSchema = new Schema<IRazorpayWebhookEvent>({
  event_id: { type: String, required: true, unique: true },
  event: { type: String, default: '', index: true },
  summary: { type: Schema.Types.Mixed, default: {} },
  received_at: { type: Date, default: Date.now, index: true },
  processed_at: { type: Date, default: null },
  error: { type: String, default: '', maxlength: 1000 },
  outcome: { type: String, default: '' },
});

export const RazorpayWebhookEventModel = model<IRazorpayWebhookEvent>(
  'RazorpayWebhookEvent',
  razorpayWebhookEventSchema
);
