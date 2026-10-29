import { gql } from '@apollo/client';
import type { FreeJustification } from '@duncit/gql-types';
import { FREE_JUSTIFICATION_FIELDS } from '@duncit/utils';
import { BREAKDOWN_FIELDS } from '../pricing/queries';
import type { PriceBreakdown } from '../pricing/types';

/**
 * A booking offer's terms as either side reads them: the host's terms (their
 * offer, or their latest counter back) with the ask beside the price — the
 * fewest guests the venue is paid for, what it should provide, a note — the
 * server's quote at the most guests (`quote`) and at the fewest (`quote_min`),
 * whose move it is and until when, the venue's counter while there is one, the
 * photos each side attached, how many counters each side has used of its share,
 * and whether it is free (a free pod, or a free venue with the host's reason) —
 * accepted or declined, never countered.
 */
export const OFFER_TERMS_FIELDS = `
  slot_id
  status
  round
  awaiting
  model
  rate
  pax
  min_guests
  offerings
  note
  images
  pets
  space_label
  expires_at
  counters_per_side
  host_counters_used
  venue_counters_used
  free_pod${FREE_JUSTIFICATION_FIELDS}
  quote { ${BREAKDOWN_FIELDS} }
  quote_min { ${BREAKDOWN_FIELDS} }
  counter { model rate min_guests offerings note images at quote { ${BREAKDOWN_FIELDS} } quote_min { ${BREAKDOWN_FIELDS} } }
`;

/** A host's booking offer as the venue reads it: the terms above, and every step so far. */
export const VENUE_OFFER_FIELDS = `${OFFER_TERMS_FIELDS}
  history { by action model rate min_guests total note at }
`;

/** The venue's booking requests — pending holds, each with its host's offer. */
export const VENUE_BOOKING_REQUESTS = gql`
  query VenueBookingRequests($venue_id: ID) {
    venueSlotRequests(venue_id: $venue_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
      whole_day
      price
      requested_at
      pod_id
      pod_title
      host_name
      host_email
      host_phone
      pod_is_free
      offer { ${VENUE_OFFER_FIELDS} }
    }
  }
`;

/** Every answer carries the round it read; the server refuses it (OFFER_CHANGED) when the other side moved first. */
export const ACCEPT_VENUE_OFFER = gql`
  mutation AcceptVenueOffer($slot_id: ID!, $round: Int) {
    approveVenueSlotRequest(slot_id: $slot_id, round: $round) {
      id
      status
    }
  }
`;

export const REJECT_VENUE_OFFER = gql`
  mutation RejectVenueOffer($slot_id: ID!, $reason: String, $round: Int) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason, round: $round) {
      id
      status
    }
  }
`;

export const COUNTER_VENUE_OFFER = gql`
  mutation CounterVenueOffer($slot_id: ID!, $terms: VenueOfferTermsInput!, $note: String, $round: Int) {
    counterVenueOffer(slot_id: $slot_id, terms: $terms, note: $note, round: $round) {
      slot_id
      status
      round
    }
  }
`;

/** The venue's counter priced for the booking's own window, at the most and the fewest guests, before it is sent. */
export const VENUE_COUNTER_QUOTE = gql`
  query VenueCounterQuote($slot_id: ID!, $terms: VenueOfferTermsInput!) {
    venueCounterQuote(slot_id: $slot_id, terms: $terms) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
      quote_min { ${BREAKDOWN_FIELDS} }
    }
  }
`;

/**
 * Either side changes its own latest counter before the other side has seen it
 * (refused as OFFER_SEEN after). Priced again for the round read; the round moves on.
 */
export const EDIT_VENUE_OFFER_COUNTER = gql`
  mutation EditVenueOfferCounter($pod_id: ID!, $terms: VenueOfferTermsInput!, $note: String, $round: Int!) {
    editVenueOfferCounter(pod_id: $pod_id, terms: $terms, note: $note, round: $round) {
      slot_id
      status
      round
    }
  }
`;

/** Either side takes back its own latest counter before the other side has seen it: the terms before it stand again. */
export const WITHDRAW_VENUE_OFFER_COUNTER = gql`
  mutation WithdrawVenueOfferCounter($pod_id: ID!, $round: Int!) {
    withdrawVenueOfferCounter(pod_id: $pod_id, round: $round) {
      slot_id
      status
      round
    }
  }
`;

/** An edit of one's own counter, priced before it is saved. */
export const EDIT_COUNTER_QUOTE = gql`
  query EditCounterQuote($pod_id: ID!, $terms: VenueOfferTermsInput!) {
    editCounterQuote(pod_id: $pod_id, terms: $terms) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
      quote_min { ${BREAKDOWN_FIELDS} }
    }
  }
`;

export interface OfferHistoryEntry {
  by: string;
  action: string;
  model: string | null;
  rate: number | null;
  /** The fewest guests the step's terms were paid for; absent or 0 when they named none. */
  min_guests?: number | null;
  total: number | null;
  note: string;
  at: string | null;
}

/** The venue's counter, while it is the terms on the table. */
export interface OfferCounter {
  model: string;
  rate: number;
  min_guests: number;
  offerings: string[];
  note: string;
  /** Photos the venue attached; absent from older servers. */
  images?: string[];
  at: string | null;
  quote: PriceBreakdown;
  quote_min: PriceBreakdown;
}

/** Why the host asked the venue for the window free, and when they accepted Duncit's free policy. */
export type OfferFreeJustification = Omit<FreeJustification, '__typename'>;

/** `OFFER_TERMS_FIELDS`, as both sides' answers read it. */
export interface OfferTerms {
  slot_id: string;
  status: string;
  round: number;
  awaiting: string | null;
  model: string;
  rate: number;
  /** The most guests: the pod's spots. */
  pax: number;
  /** The fewest guests the venue is paid for on the host's terms. */
  min_guests: number;
  offerings: string[];
  note: string;
  /** Photos the host attached to their latest counter-back; absent from older servers. */
  images?: string[];
  pets: boolean;
  space_label: string;
  /** When the side whose move it is must answer by; null once closed. */
  expires_at: string | null;
  /** Counters each side may make, and each side's so far (Pod Settings); absent from older servers. */
  counters_per_side?: number;
  host_counters_used?: number;
  venue_counters_used?: number;
  /** The pod was free when the offer was made: the venue accepts or declines it, nobody counters. Absent from older servers. */
  free_pod?: boolean;
  /** Why a free venue (model FREE) is free; null on a priced offer, absent from older servers. */
  free_justification?: OfferFreeJustification | null;
  quote: PriceBreakdown;
  quote_min: PriceBreakdown;
  counter: OfferCounter | null;
}

export interface BookingOffer extends OfferTerms {
  history: OfferHistoryEntry[];
}

/** What a request needs to be answered (and named in the confirmation). */
export interface OfferRequestSummary {
  slot_id: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  pod_title: string;
  pod_is_free: boolean;
  /** The legacy slot price, for a request from before offers. */
  price: number;
}

export interface BookingRequestRow extends OfferRequestSummary {
  venue_id: string;
  whole_day: boolean;
  requested_at: string;
  pod_id: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  offer: BookingOffer | null;
}

export interface CounterQuoteResult {
  ok: boolean;
  message: string | null;
  /** Priced for the most guests. */
  quote: PriceBreakdown | null;
  /** Priced for the fewest guests; absent from the older window quotes. */
  quote_min?: PriceBreakdown | null;
}
