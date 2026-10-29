import { Schema } from 'mongoose';
import { priceSnapshotSchema } from '@modules/venues/venuePricing/venuePricing.schema.model';
import {
  FREE_REASONS,
  OFFER_ASK_LIMITS,
  OFFER_MODELS,
  VENUE_OFFER_ACTIONS,
  VENUE_OFFER_MODELS,
  VENUE_OFFER_STATUSES,
  type FreeJustification,
  type VenueOffer,
  type VenueOfferCounter,
  type VenueOfferHistoryEntry,
} from './venueOffer.types';
import { FREE_DETAILS_LIMITS } from './venueOffer.free';

/** Why a pod or a venue booking is free, and who accepted the free policy when (venueOffer.free). */
export const freeJustificationSchema = new Schema<FreeJustification>(
  {
    reason: { type: String, enum: FREE_REASONS, required: true },
    details: { type: String, default: '', trim: true, maxlength: FREE_DETAILS_LIMITS.max },
    accepted_at: { type: Date, required: true },
    accepted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

/** The ask beside a side's price — shared by the host's terms and the venue's counter. */
const askFields = {
  // 0 on offers made before minimums: no floor, the guests as booked.
  min_guests: { type: Number, default: 0, min: 0 },
  offerings: {
    type: [{ type: String, trim: true, maxlength: OFFER_ASK_LIMITS.offeringLength }],
    default: [],
  },
  quote_min: { type: priceSnapshotSchema, default: null },
  // The venue's charges the terms were priced with (see OfferCharges).
  charges: { type: Schema.Types.Mixed, default: null },
  // Photos attached to a counter; empty on an opening offer and on older rows.
  images: { type: [{ type: String, trim: true }], default: [] },
};

const counterSchema = new Schema<VenueOfferCounter>(
  {
    model: { type: String, enum: VENUE_OFFER_MODELS, required: true },
    rate: { type: Number, required: true, min: 0 },
    quote: { type: priceSnapshotSchema, required: true },
    note: { type: String, default: '', trim: true, maxlength: OFFER_ASK_LIMITS.note },
    at: { type: Date, required: true },
    ...askFields,
  },
  { _id: false }
);

const historySchema = new Schema<VenueOfferHistoryEntry>(
  {
    by: { type: String, enum: ['HOST', 'VENUE'], required: true },
    action: { type: String, enum: VENUE_OFFER_ACTIONS, required: true },
    model: { type: String, enum: [...OFFER_MODELS, null], default: null },
    rate: { type: Number, default: null },
    total: { type: Number, default: null },
    min_guests: { type: Number, default: null },
    note: { type: String, default: '', trim: true, maxlength: OFFER_ASK_LIMITS.note },
    at: { type: Date, required: true },
  },
  { _id: false }
);

/** A host's offer for a venue booking and the negotiation on it (see venueOffer.types). */
export const venueOfferSchema = new Schema<VenueOffer>(
  {
    // The host's terms: priced, or FREE on an opening offer. A counter is always priced (counterSchema).
    model: { type: String, enum: OFFER_MODELS, required: true },
    rate: { type: Number, required: true, min: 0 },
    pax: { type: Number, default: 0, min: 0 },
    pets: { type: Boolean, default: false },
    quote: { type: priceSnapshotSchema, required: true },
    status: { type: String, enum: VENUE_OFFER_STATUSES, required: true },
    round: { type: Number, default: 1, min: 1 },
    counter: { type: counterSchema, default: null },
    history: { type: [historySchema], default: [] },
    note: { type: String, default: '', trim: true, maxlength: OFFER_ASK_LIMITS.note },
    expires_at: { type: Date, default: null },
    move: { type: Number, default: 0, min: 0 },
    // Where the offer stood before its latest counter (VenueOfferPrior): what a withdrawal puts back.
    prior: { type: Schema.Types.Mixed, default: null },
    // A free pod's offer: accepted or declined, never countered.
    free_pod: { type: Boolean, default: false },
    // Why a FREE offer is free; null on priced offers.
    free_justification: { type: freeJustificationSchema, default: null },
    ...askFields,
  },
  { _id: false }
);
