import { gql } from '@apollo/client';
import type { VenueOfferSettings } from './booking-offers.types';

/** A venue as the Booking offers card reads it: its own settings and what is in effect. */
export interface BookingOffersVenue {
  id: string;
  /** What is in effect: the venue's own value, or Duncit's default where it set 0. */
  offer_min_guests: number;
  offer_response_hours: number;
  settings: { offers: VenueOfferSettings };
}

/** The owner's venues with their booking-offer settings and minimum spend (Fees & Minimum Spend). */
export const MY_VENUES_OFFERS = gql`
  query MyVenuesOffers {
    myVenues {
      id
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
export const UPDATE_VENUE_OFFER_SETTINGS = gql`
  mutation UpdateVenueOfferSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      offer_min_guests
      offer_response_hours
    }
  }
`;
