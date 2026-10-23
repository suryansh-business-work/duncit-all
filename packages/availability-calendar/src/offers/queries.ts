import { gql } from '@apollo/client';
import { BREAKDOWN_FIELDS } from '../pricing/queries';
import type { PriceBreakdown } from '../pricing/types';

/**
 * A host's booking offer as the venue reads it: the terms, the server's quote of
 * them (venue receives, Duncit's fee on top, what the host pays), whose move it
 * is, the venue's counter while there is one, and every step so far.
 */
export const VENUE_OFFER_FIELDS = `
  slot_id
  status
  round
  awaiting
  model
  rate
  pax
  pets
  space_label
  quote { ${BREAKDOWN_FIELDS} }
  counter { model rate note at quote { ${BREAKDOWN_FIELDS} } }
  history { by action model rate total note at }
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

export const ACCEPT_VENUE_OFFER = gql`
  mutation AcceptVenueOffer($slot_id: ID!) {
    approveVenueSlotRequest(slot_id: $slot_id) {
      id
      status
    }
  }
`;

export const REJECT_VENUE_OFFER = gql`
  mutation RejectVenueOffer($slot_id: ID!, $reason: String) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason) {
      id
      status
    }
  }
`;

export const COUNTER_VENUE_OFFER = gql`
  mutation CounterVenueOffer($slot_id: ID!, $terms: VenueOfferTermsInput!, $note: String) {
    counterVenueOffer(slot_id: $slot_id, terms: $terms, note: $note) {
      slot_id
      status
      round
    }
  }
`;

/** The venue's counter priced for the booking's own window, before it is sent. */
export const VENUE_COUNTER_QUOTE = gql`
  query VenueCounterQuote($slot_id: ID!, $terms: VenueOfferTermsInput!) {
    venueCounterQuote(slot_id: $slot_id, terms: $terms) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
    }
  }
`;

export interface OfferHistoryEntry {
  by: string;
  action: string;
  model: string | null;
  rate: number | null;
  total: number | null;
  note: string;
  at: string | null;
}

export interface BookingOffer {
  slot_id: string;
  status: string;
  round: number;
  awaiting: string | null;
  model: string;
  rate: number;
  pax: number;
  pets: boolean;
  space_label: string;
  quote: PriceBreakdown;
  counter: { model: string; rate: number; note: string; at: string | null; quote: PriceBreakdown } | null;
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
  quote: PriceBreakdown | null;
}
