import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Someone who asked to hear about a venue's events — at the food checkout, so
 * often a guest with no account. The mobile number is the identity: one row per
 * number per venue, and a signed-in guest's account rides along so they can
 * also be told in the app.
 */
export const VENUE_SUBSCRIBER_SOURCES = ['FOOD_ORDER'] as const;
export type VenueSubscriberSource = (typeof VENUE_SUBSCRIBER_SOURCES)[number];

export interface IVenueSubscriber extends Document<Types.ObjectId> {
  venue_id: Types.ObjectId;
  /** Ten digits, as the checkout validated it. */
  phone: string;
  name: string;
  /** The account that subscribed; null for a guest. */
  user_id: Types.ObjectId | null;
  source: VenueSubscriberSource;
  /** The order the consent was given on — the record of when and where they asked. */
  order_id: Types.ObjectId | null;
  is_active: boolean;
  /** How many event messages this subscriber has been sent, and when last. */
  notified_count: number;
  last_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const venueSubscriberSchema = new Schema<IVenueSubscriber>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    phone: { type: String, required: true, trim: true },
    name: { type: String, default: '', trim: true, maxlength: 80 },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: VENUE_SUBSCRIBER_SOURCES, default: 'FOOD_ORDER' },
    order_id: { type: Schema.Types.ObjectId, ref: 'VenueFoodOrder', default: null },
    is_active: { type: Boolean, default: true },
    notified_count: { type: Number, default: 0, min: 0 },
    last_notified_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One subscription per number per venue — the database, not a read-then-write, refuses the duplicate.
venueSubscriberSchema.index({ venue_id: 1, phone: 1 }, { unique: true });
// The fan-out's read and the dashboard's count: a venue's active subscribers.
venueSubscriberSchema.index({ venue_id: 1, is_active: 1, created_at: 1 });

export const VenueSubscriberModel = model<IVenueSubscriber>('VenueSubscriber', venueSubscriberSchema);
