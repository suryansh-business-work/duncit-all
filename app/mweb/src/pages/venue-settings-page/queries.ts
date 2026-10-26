import { gql } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';
import type { SwitchableVenue } from '@duncit/utils';
import type { VenueOfferSettings } from './booking-offers-form';

/** One `myVenues` row as this page reads it — the switcher's fields, the policy and the booking offers. */
export interface SettingsVenue extends SwitchableVenue {
  id: string;
  /** What is in effect: the venue's own value, or Duncit's default where it set 0. */
  offer_min_guests: number;
  offer_response_hours: number;
  settings?: { cancellation?: VenueCancellationPolicy | null; offers?: VenueOfferSettings | null } | null;
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

/** The owner's venues, each with the cancellation policy and the booking offers this page edits. */
export const MY_VENUES_CANCELLATION = gql`
  query MyVenuesCancellation {
    myVenues {
      id
      venue_name
      status
      city
      offer_min_guests
      offer_response_hours
      settings {
        ${CANCELLATION_FIELDS}
        offers {
          min_guests
          response_hours
          min_business {
            model
            amount
          }
        }
      }
    }
  }
`;

/**
 * `updateVenueSettings` merges the keys it is given, so sending only
 * `cancellation` leaves the operating hours and auto-extend rules alone.
 */
export const UPDATE_VENUE_CANCELLATION_POLICY = gql`
  mutation UpdateVenueCancellationPolicy($venue_doc_id: ID!, $input: VenueSettingsInput!) {
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
export const UPDATE_VENUE_BOOKING_OFFERS = gql`
  mutation UpdateVenueBookingOffers($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      offer_min_guests
      offer_response_hours
    }
  }
`;
