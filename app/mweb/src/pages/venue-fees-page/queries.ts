import { gql } from '@apollo/client';
import type { SwitchableVenue } from '@duncit/utils';
import type { VenueOfferSettings } from './booking-offers-form';

/** One `myVenues` row as Fees & Minimum Spend reads it — the switcher's fields and the booking offers. */
export interface FeesVenue extends SwitchableVenue {
  id: string;
  /** What is in effect: the venue's own value, or Duncit's default where it set 0. */
  offer_min_guests: number;
  offer_response_hours: number;
  settings?: { offers?: VenueOfferSettings | null } | null;
}

/** The owner's venues, each with the booking offers and minimum spend this page edits. */
export const MY_VENUES_OFFERS = gql`
  query MyVenuesOffers {
    myVenues {
      id
      venue_name
      status
      city
      offer_min_guests
      offer_response_hours
      settings {
        offers {
          min_guests
          response_hours
          min_business {
            model
            amount
          }
          min_spend
        }
      }
    }
  }
`;

/**
 * Booking offers through the venue settings merge — only `offers` is sent, so
 * every other setting is left alone. It answers with the values now in effect;
 * the page re-reads the stored ones after.
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
