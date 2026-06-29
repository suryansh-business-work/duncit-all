import { gql } from '@/generated/graphql';

/** Active locations for the country → state → city → area picker (mWeb parity). */
export const LocationsDocument = gql(`
  query MobileLocations {
    locations(filter: { is_active: true }) {
      id
      location_name
      city
      state
      state_code
      country
      country_code
      location_image
      location_pincode
      active_club_count
      location_zones {
        zone_name
        pincode
      }
    }
    activePodLocationIds
  }
`);

/** Persist the user's selected header location (parity with mWeb's header). */
export const SetSelectedLocationDocument = gql(`
  mutation MobileSetSelectedLocation($locationId: ID) {
    setMySelectedLocation(location_id: $locationId) {
      user_id
      selected_location_id
    }
  }
`);
