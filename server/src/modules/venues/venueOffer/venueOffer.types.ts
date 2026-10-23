/**
 * A host's offer to a venue: the host names the window, the guests and how
 * they will pay (per guest, per hour, per slot or a flat price). The venue
 * accepts, rejects or counters; a counter needs the host's yes. The venue's
 * own charges (fees, minimum spend, price rules, GST) are added by the one
 * venue price calculation, and Duncit's venue commission goes on top.
 */
import type { VenuePriceBreakdown } from '@modules/venues/venuePricing/venuePricing.types';

export const VENUE_OFFER_MODELS = ['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT'] as const;
export type VenueOfferModel = (typeof VENUE_OFFER_MODELS)[number];

/** SENT: waiting on the venue. COUNTERED: waiting on the host. The rest are closed. */
export const VENUE_OFFER_STATUSES = ['SENT', 'COUNTERED', 'ACCEPTED', 'DECLINED'] as const;
export type VenueOfferStatus = (typeof VENUE_OFFER_STATUSES)[number];

export const VENUE_OFFER_ACTIONS = ['OFFER', 'COUNTER', 'ACCEPT', 'REJECT'] as const;
export type VenueOfferAction = (typeof VENUE_OFFER_ACTIONS)[number];

export type VenueOfferParty = 'HOST' | 'VENUE';

/** The price terms one side put forward. */
export interface VenueOfferTerms {
  model: VenueOfferModel;
  /** Rupees: per guest, per hour, for the slot, or the flat price. */
  rate: number;
}

/** What a host asks for. Times are ISO instants. */
export interface VenueOfferRequest extends VenueOfferTerms {
  start_at: string;
  end_at: string;
  space_label?: string | null;
  pax?: number | null;
  pets?: boolean | null;
}

export type OfferQuote = VenuePriceBreakdown & { confirmed_at: Date };

export interface VenueOfferCounter extends VenueOfferTerms {
  quote: OfferQuote;
  note: string;
  at: Date;
}

export interface VenueOfferHistoryEntry {
  by: VenueOfferParty;
  action: VenueOfferAction;
  model: VenueOfferModel | null;
  rate: number | null;
  total: number | null;
  note: string;
  at: Date;
}

/** The negotiation, stored on the booking's VenueSlot while it is PENDING and kept after. */
export interface VenueOffer extends VenueOfferTerms {
  pax: number;
  pets: boolean;
  /** The host's offer, priced. */
  quote: OfferQuote;
  status: VenueOfferStatus;
  /** 1 for the host's offer, +1 per counter. */
  round: number;
  counter: VenueOfferCounter | null;
  history: VenueOfferHistoryEntry[];
}

/** The largest per-unit or flat amount an offer may name, in rupees. */
export const MAX_OFFER_RATE = 10_000_000;
