import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
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

/**
 * The Google Maps key from the server's public client config, which reads it
 * from Tech → Environment → Google Map. Resolved at runtime so rotating the key
 * is a Tech-portal edit, not a rebuild of every app that shows a map.
 */
export const PUBLIC_MAPS_KEY = gql`
  query LocationPublicMapsKey {
    publicClientConfig {
      google_maps_api_key
    }
  }
`;

/**
 * The Maps key, or `''` until it arrives and when none is configured — which is
 * what `MapEmbedCard`'s keyless fallback and "key missing" state expect.
 * `cache-first`, so every map on a page shares one request.
 */
export function useGoogleMapsApiKey(): string {
  const { data } = useQuery<{ publicClientConfig?: { google_maps_api_key?: string | null } }>(PUBLIC_MAPS_KEY, {
    fetchPolicy: 'cache-first',
  });
  return data?.publicClientConfig?.google_maps_api_key?.trim() ?? '';
}
