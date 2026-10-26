import mongoose, { Schema } from 'mongoose';

/** What an OFFER line records: one move in a booking offer's negotiation. */
export const VENUE_CHAT_OFFER_EVENTS = ['OFFER', 'COUNTER', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const;
export type VenueChatOfferEvent = (typeof VENUE_CHAT_OFFER_EVENTS)[number];

/**
 * The terms a move put on the table, frozen as they stood — the booking hold
 * holding the live offer is deleted when it is declined or expires, so the
 * thread is the negotiation's record. Money is rupees; `*_min` is priced at the
 * fewest guests, `*_max` at the most.
 */
export interface VenueChatOfferPayload {
  slot_id: string;
  round: number;
  event: VenueChatOfferEvent;
  /** Who made the move; SYSTEM for an answer that ran late. */
  by: 'HOST' | 'VENUE' | 'SYSTEM';
  model: string;
  rate: number;
  min_guests: number;
  max_guests: number;
  offerings: string[];
  note: string;
  start_at: Date;
  end_at: Date;
  space_label: string;
  pets: boolean;
  venue_receives_min: number;
  venue_receives_max: number;
  total_min: number;
  total_max: number;
  /** When the other side must answer by; null once the offer is closed. */
  expires_at: Date | null;
  /** Why it was declined, when someone said. */
  reason: string;
  /** Photos the mover attached to a counter (uploaded https URLs). */
  images: string[];
}

const offerPayloadSchema = new Schema<VenueChatOfferPayload>(
  {
    slot_id: { type: String, required: true },
    round: { type: Number, required: true },
    event: { type: String, enum: VENUE_CHAT_OFFER_EVENTS, required: true },
    by: { type: String, enum: ['HOST', 'VENUE', 'SYSTEM'], required: true },
    model: { type: String, default: '' },
    rate: { type: Number, default: 0 },
    min_guests: { type: Number, default: 0 },
    max_guests: { type: Number, default: 0 },
    offerings: { type: [String], default: [] },
    note: { type: String, default: '' },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    space_label: { type: String, default: '' },
    pets: { type: Boolean, default: false },
    venue_receives_min: { type: Number, default: 0 },
    venue_receives_max: { type: Number, default: 0 },
    total_min: { type: Number, default: 0 },
    total_max: { type: Number, default: 0 },
    expires_at: { type: Date, default: null },
    reason: { type: String, default: '' },
    images: { type: [String], default: [] },
  },
  { _id: false }
);

/** One member's reaction to a line: one row per member per emoji. */
const reactionSchema = new Schema({ user_id: { type: String, required: true }, emoji: { type: String, required: true } }, { _id: false });

/**
 * One line of a venue booking's chat: the pod's hosts and the venue's owner,
 * nobody else. Kept out of PodMessage on purpose — a pod's group chat reads by
 * `pod_id`, and a thread about deposits and set-up times must never surface
 * in front of the pod's guests.
 */
const VenueChatMessageSchema = new Schema(
  {
    pod_id: { type: String, required: true },
    venue_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    /** Which side wrote it, fixed at send time: the venue's owner or a pod host. */
    side: { type: String, enum: ['HOST', 'VENUE'], required: true },
    /** OFFER: a move in the booking offer, posted by the server — `text` is its one-line summary. */
    type: { type: String, enum: ['TEXT', 'IMAGE', 'OFFER'], default: 'TEXT' },
    text: { type: String, default: '' },
    image_url: { type: String, default: '' },
    offer: { type: offerPayloadSchema, default: null },
    reactions: { type: [reactionSchema], default: [] },
    /** When its author last changed the text (or the mover their counter); null while it is as first sent. */
    edited_at: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VenueChatMessageSchema.index({ pod_id: 1, createdAt: -1 });

export const VenueChatMessageModel = mongoose.model('VenueChatMessage', VenueChatMessageSchema);
