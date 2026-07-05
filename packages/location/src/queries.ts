import { gql, useQuery } from '@apollo/client';
import type { LocationDoc } from './types';

/**
 * Active admin-managed locations — the single source the picker reads from.
 * `cache-first` so the (small, rarely-changing) list is fetched once per app
 * session and shared across every location field.
 */
export const ADMIN_LOCATIONS = gql`
  query AdminLocations {
    locations(filter: { is_active: true }) {
      id
      location_name
      country
      country_code
      state
      state_code
      city
      location_pincode
      location_zones {
        zone_name
        zone_code
        pincode
      }
    }
  }
`;

export function useAdminLocations() {
  const { data, loading, error } = useQuery<{ locations: LocationDoc[] }>(ADMIN_LOCATIONS, {
    fetchPolicy: 'cache-first',
  });
  return { locations: data?.locations ?? [], loading, error };
}
