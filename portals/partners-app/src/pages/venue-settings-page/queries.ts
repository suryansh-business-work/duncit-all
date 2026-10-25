import { gql } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';
import type { VenueOfferSettings } from './booking-offers/booking-offers.types';

/** Just the part of a venue this page reads — the picker, the policy and the booking-offer settings. */
export interface VenueSettingsVenue {
  id: string;
  venue_name: string;
  status: string;
  /** What is in effect: the venue's own value, or Duncit's default where it set 0. */
  offer_min_guests: number;
  offer_response_hours: number;
  settings: { cancellation: VenueCancellationPolicy; offers: VenueOfferSettings };
}

const CANCELLATION_FIELDS = `
  cancellation {
    reschedule_only
    tiers {
      hours_before
      charge_type
      value
    }
  }
`;

/** The owner's venues, each with the policy and the booking-offer settings this page edits. */
export const MY_VENUES_SETTINGS = gql`
  query MyVenuesSettings {
    myVenues {
      id
      venue_name
      status
      offer_min_guests
      offer_response_hours
      settings {
        ${CANCELLATION_FIELDS}
        offers {
          min_guests
          response_hours
        }
      }
    }
  }
`;

/**
 * The same mutation Operating Hours and Auto-extend save through — it merges
 * the keys it is given, so sending only `cancellation` leaves the rest alone.
 */
export const UPDATE_VENUE_CANCELLATION = gql`
  mutation UpdateVenueCancellation($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      settings {
        ${CANCELLATION_FIELDS}
      }
    }
  }
`;

/**
 * Booking offers through the same merge — only `offers` is sent. It answers
 * with the values now in effect; the page re-reads the stored ones after.
 */
export const UPDATE_VENUE_OFFER_SETTINGS = gql`
  mutation UpdateVenueOfferSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      offer_min_guests
      offer_response_hours
    }
  }
`;
