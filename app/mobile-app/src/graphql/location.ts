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
      location_zones {
        zone_name
        pincode
      }
    }
    activePodLocationIds
  }
`);
