import { gql } from '@apollo/client';
import type { VenueOfferDefaults } from './venue-offers.types';

/** The two platform defaults a venue's booking offers fall back to. */
export const APP_SETTINGS_VENUE_OFFERS = gql`
  query AppSettingsVenueOffers {
    appSettings {
      venue_offer_min_guests_default
      venue_offer_response_hours_default
      updated_at
    }
  }
`;

/** Saves only these two — `updateAppSettings` leaves every field it is not given alone. */
export const UPDATE_APP_SETTINGS_VENUE_OFFERS = gql`
  mutation UpdateAppSettingsVenueOffers($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      venue_offer_min_guests_default
      venue_offer_response_hours_default
      updated_at
    }
  }
`;

export interface AppSettingsVenueOffers {
  appSettings: (VenueOfferDefaults & { updated_at?: string | null }) | null;
}
