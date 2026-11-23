import { Schema, model, type Document, type Types } from 'mongoose';

/** Where a venue's interest came from — decided by the server, never by the payload. */
export const VENUE_KIT_SOURCES = ['WEBSITE', 'VENUES_PORTAL'] as const;
export type VenueKitSource = (typeof VENUE_KIT_SOURCES)[number];

/** How far the venues team has taken one interested venue. */
export const VENUE_KIT_INTEREST_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'NOT_INTERESTED'] as const;
export type VenueKitInterestStatus = (typeof VENUE_KIT_INTEREST_STATUSES)[number];

/**
 * One venue that asked to hear about the Venue Kit.
 *
 * Keyed by the verified email: a second submission from the same mailbox
 * refreshes the row (name, phone, last submitted) instead of stacking a
 * duplicate lead, and keeps the follow-up status the team already set.
 * `phone_verified_at` is null when the number was given but not proved —
 * the phone code is optional by design.
 */
export interface IVenueKitInterest extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  email_verified_at: Date;
  phone_extension: string;
  phone_number: string;
  phone_verified_at: Date | null;
  source: VenueKitSource;
  status: VenueKitInterestStatus;
  /** The team's own note on the lead; '' until somebody writes one. */
  note: string;
  submission_count: number;
  last_submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

const venueKitInterestSchema = new Schema<IVenueKitInterest>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    email_verified_at: { type: Date, required: true },
    phone_extension: { type: String, default: '+91' },
    phone_number: { type: String, default: '' },
    phone_verified_at: { type: Date, default: null },
    source: { type: String, enum: VENUE_KIT_SOURCES, required: true },
    status: { type: String, enum: VENUE_KIT_INTEREST_STATUSES, default: 'NEW' },
    note: { type: String, default: '', trim: true },
    submission_count: { type: Number, default: 1 },
    last_submitted_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

venueKitInterestSchema.index({ email: 1 }, { unique: true });
venueKitInterestSchema.index({ status: 1, created_at: -1 });
venueKitInterestSchema.index({ created_at: -1 });

export const VenueKitInterestModel = model<IVenueKitInterest>('VenueKitInterest', venueKitInterestSchema);

/**
 * The Venue Kit's one annual plan, as every surface shows it.
 *
 * A singleton (`key: 'default'`), so the price and the quantities in the
 * feature list are data an admin changes rather than copy a deploy changes.
 * Money is held in paise, as integers, like every other amount on the platform.
 */
export interface IVenueKitOffer extends Document {
  key: string;
  annual_price_paise: number;
  included_table_labels: number;
  extra_label_price_paise: number;
  pos_activation_months: number;
  gift_card_count: number;
  gift_card_value_paise: number;
  collab_gift_card_discount_pct: number;
  order_benefit_pct: number;
  created_at: Date;
  updated_at: Date;
}

/** What a fresh install offers until an admin changes it (the launch announcement's numbers). */
export const VENUE_KIT_OFFER_DEFAULTS = {
  annual_price_paise: 999_900,
  included_table_labels: 25,
  extra_label_price_paise: 10_000,
  pos_activation_months: 12,
  gift_card_count: 10,
  gift_card_value_paise: 10_000,
  collab_gift_card_discount_pct: 10,
  order_benefit_pct: 1,
} as const;

const venueKitOfferSchema = new Schema<IVenueKitOffer>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    annual_price_paise: { type: Number, required: true, min: 0 },
    included_table_labels: { type: Number, required: true, min: 0 },
    extra_label_price_paise: { type: Number, required: true, min: 0 },
    pos_activation_months: { type: Number, required: true, min: 0 },
    gift_card_count: { type: Number, required: true, min: 0 },
    gift_card_value_paise: { type: Number, required: true, min: 0 },
    collab_gift_card_discount_pct: { type: Number, required: true, min: 0, max: 100 },
    order_benefit_pct: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const VenueKitOfferModel = model<IVenueKitOffer>('VenueKitOffer', venueKitOfferSchema);
