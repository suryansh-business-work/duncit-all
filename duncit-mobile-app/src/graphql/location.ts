import { gql } from '@/generated/graphql';

/** Active locations (cities) for the location picker dialog (mWeb parity). */
export const LocationsDocument = gql(`
  query MobileLocations {
    locations(filter: { is_active: true }) {
      id
      location_name
      city
      state
      location_image
      location_zones {
        zone_name
        pincode
      }
    }
  }
`);
