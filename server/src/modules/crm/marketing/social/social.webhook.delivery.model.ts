import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * One signed delivery from Meta's webhook, kept before it is processed: the
 * delivery is the job (social.webhook.queue.ts), so a crash between the 200
 * and the processing loses nothing, and the last deliveries are what Social
 * Accounts › Webhooks lists. Without this record a webhook that never arrives
 * and one that arrives and is dropped look the same.
 *
 * `body` is the raw JSON Meta signed, as it came. Deliveries are forgotten
 * after RETENTION_DAYS; the messages and comments they carried are stored in
 * their own collections and stay.
 */
export const WEBHOOK_DELIVERY_STATUSES = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

const RETENTION_DAYS = 14;

const outcomeSchema = new Schema(
  {
    /** Events the payload carried that the Inbox stores (DMs and comments). */
    events: { type: Number, default: 0 },
    /** New DMs and comments stored. */
    stored: { type: Number, default: 0 },
    /** Already stored: a Meta re-delivery, or the echo of a message the backfill or a send already kept. */
    duplicates: { type: Number, default: 0 },
    /** For an account no one has connected (or since removed). */
    unknown_account: { type: Number, default: 0 },
    /** Stored as our own outbound message (Meta's echo of a send), never as inbound. */
    echoes: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
);

const deliverySchema = new Schema(
  {
    /** Meta's `object`: `instagram` or `page` (anything else is kept and ignored). */
    object: { type: String, default: '' },
    /** The account ids the entries name (an Instagram account or a Page). */
    entry_ids: { type: [String], default: [] },
    /** The webhook fields the entries carry (`messages`, `comments`, `feed`, …). */
    fields: { type: [String], default: [] },
    body: { type: String, required: true },
    status: { type: String, enum: WEBHOOK_DELIVERY_STATUSES, default: 'RECEIVED', index: true },
    attempts: { type: Number, default: 0 },
    outcome: { type: outcomeSchema, default: () => ({}) },
    error: { type: String, default: '' },
    received_at: { type: Date, default: Date.now },
    processing_at: { type: Date, default: null },
    processed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
deliverySchema.index({ received_at: -1 });
deliverySchema.index({ created_at: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

export type SocialWebhookDeliveryDoc = InferSchemaType<typeof deliverySchema> & { _id: Types.ObjectId };
export type WebhookOutcome = InferSchemaType<typeof outcomeSchema>;

export const SocialWebhookDeliveryModel = model('SocialWebhookDelivery', deliverySchema);
