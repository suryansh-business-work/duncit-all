/**
 * A host's offer to a venue: the host names the window, the guests (from the
 * venue's minimum up to the pod's spots), how they will pay (per guest, per
 * hour, per slot or a flat price) and what the venue should provide. The two
 * sides bargain in the venue chat: whoever's move it is accepts, rejects or
 * counters, until one side accepts, one rejects or the answer runs late. The
 * venue's own charges (fees, minimum spend, price rules, GST) are added by the
 * one venue price calculation, and Duncit's venue commission goes on top.
 */
import type { VenuePriceBreakdown, VenuePricing } from '@modules/venues/venuePricing/venuePricing.types';

export const VENUE_OFFER_MODELS = ['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT'] as const;
export type VenueOfferModel = (typeof VENUE_OFFER_MODELS)[number];

/** SENT: the host's terms, waiting on the venue. COUNTERED: the venue's terms, waiting on the host. The rest are closed. */
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

/**
 * What a side asks of the venue beside the price: the fewest guests the money
 * is for, what the venue should provide for it (a list of points), and a note.
 * Both sides may change all three when they counter; the window and the most
 * guests (the pod's spots) are fixed for the life of an offer.
 */
export interface VenueOfferAsk {
  /** The fewest guests the venue is paid for (the host's seat counts). */
  min_guests: number;
  /** What the venue provides for this money, one point per entry. */
  offerings: string[];
  /** Anything else asked of the venue. Optional. */
  note: string;
}

/** Bounds on what a side writes into an offer. */
export const OFFER_ASK_LIMITS = { offerings: 20, offeringLength: 120, note: 1000 } as const;

/** What a host asks for. Times are ISO instants. */
export interface VenueOfferRequest extends VenueOfferTerms {
  start_at: string;
  end_at: string;
  space_label?: string | null;
  pax?: number | null;
  pets?: boolean | null;
  /** The fewest guests (Create Pod: the venue's own minimum, set by the server). */
  min_guests?: number | null;
  offerings?: string[] | null;
  note?: string | null;
}

export type OfferQuote = VenuePriceBreakdown & { confirmed_at: Date };

/**
 * The venue's own charges a set of terms was priced with — its price rules,
 * minimum spend, fees and GST switch. Frozen beside the quote so a per-guest
 * booking can be priced again for the people who actually came, with the
 * charges both sides saw, whatever the venue changes later.
 */
export type OfferCharges = VenuePricing;

/** One side's proposal on the table: terms, the ask, and its price at the most and the fewest guests. */
export interface VenueOfferProposal extends VenueOfferTerms, VenueOfferAsk {
  /** Priced for the most guests (the pod's spots). */
  quote: OfferQuote;
  /** Priced for `min_guests`; the same as `quote` when they are equal. Null on offers made before minimums. */
  quote_min: OfferQuote | null;
  charges: OfferCharges | null;
}

export interface VenueOfferCounter extends VenueOfferProposal {
  at: Date;
}

export interface VenueOfferHistoryEntry {
  by: VenueOfferParty;
  action: VenueOfferAction;
  model: VenueOfferModel | null;
  rate: number | null;
  total: number | null;
  /** The fewest guests on the terms this move was about. Null before minimums. */
  min_guests?: number | null;
  note: string;
  at: Date;
}

/**
 * The negotiation, stored on the booking's VenueSlot while it is PENDING and
 * kept after. The top-level terms are the HOST's latest proposal (their offer,
 * or their counter to the venue); `counter` is the VENUE's latest.
 */
export interface VenueOffer extends VenueOfferProposal {
  pax: number;
  pets: boolean;
  status: VenueOfferStatus;
  /** 1 for the host's offer, +1 per counter from either side. */
  round: number;
  counter: VenueOfferCounter | null;
  history: VenueOfferHistoryEntry[];
  /** When the side whose move it is must have answered; null on offers made before expiry. */
  expires_at: Date | null;
  /** Bumped on every move: a move names the value it read, so two answers can never both land. */
  move: number;
}

/** An agreed per-guest booking's terms, frozen at accept to price it again at completion. */
export interface VenuePriceBasis {
  model: VenueOfferModel;
  rate: number;
  min_guests: number;
  pets: boolean;
  charges: OfferCharges | null;
}

/** The largest per-unit or flat amount an offer may name, in rupees. */
export const MAX_OFFER_RATE = 10_000_000;
