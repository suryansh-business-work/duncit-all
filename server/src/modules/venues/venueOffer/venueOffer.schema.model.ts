import { Schema } from 'mongoose';
import { priceSnapshotSchema } from '@modules/venues/venuePricing/venuePricing.schema.model';
import {
  VENUE_OFFER_ACTIONS,
  VENUE_OFFER_MODELS,
  VENUE_OFFER_STATUSES,
  type VenueOffer,
  type VenueOfferCounter,
  type VenueOfferHistoryEntry,
} from './venueOffer.types';

const counterSchema = new Schema<VenueOfferCounter>(
  {
    model: { type: String, enum: VENUE_OFFER_MODELS, required: true },
    rate: { type: Number, required: true, min: 0 },
    quote: { type: priceSnapshotSchema, required: true },
    note: { type: String, default: '', trim: true, maxlength: 280 },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const historySchema = new Schema<VenueOfferHistoryEntry>(
  {
    by: { type: String, enum: ['HOST', 'VENUE'], required: true },
    action: { type: String, enum: VENUE_OFFER_ACTIONS, required: true },
    model: { type: String, enum: [...VENUE_OFFER_MODELS, null], default: null },
    rate: { type: Number, default: null },
    total: { type: Number, default: null },
    note: { type: String, default: '', trim: true, maxlength: 280 },
    at: { type: Date, required: true },
  },
  { _id: false }
);

/** A host's offer for a venue booking and the negotiation on it (see venueOffer.types). */
export const venueOfferSchema = new Schema<VenueOffer>(
  {
    model: { type: String, enum: VENUE_OFFER_MODELS, required: true },
    rate: { type: Number, required: true, min: 0 },
    pax: { type: Number, default: 0, min: 0 },
    pets: { type: Boolean, default: false },
    quote: { type: priceSnapshotSchema, required: true },
    status: { type: String, enum: VENUE_OFFER_STATUSES, required: true },
    round: { type: Number, default: 1, min: 1 },
    counter: { type: counterSchema, default: null },
    history: { type: [historySchema], default: [] },
  },
  { _id: false }
);
