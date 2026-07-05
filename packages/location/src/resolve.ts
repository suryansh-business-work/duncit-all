import { useMemo } from 'react';
import { useAdminLocations } from './queries';
import { cityPincode, localityOptions } from './locationOptions';
import { EMPTY_LOCATION, type AdminLocationValue, type LocationDoc } from './types';

/** Build a full picker value from a saved Location doc id (+ optional locality). */
export function buildLocationValue(
  locations: LocationDoc[],
  locationId: string,
  locality = '',
): AdminLocationValue {
  const doc = locations.find((loc) => loc.id === locationId);
  if (!doc) return { ...EMPTY_LOCATION, location_id: locationId, locality };
  const zone = localityOptions(locations, locationId).find((option) => option.value === locality);
  return {
    location_id: doc.id,
    country: doc.country,
    country_code: doc.country_code,
    state: doc.state,
    state_code: doc.state_code,
    city: doc.city,
    locality: zone?.value ?? '',
    pincode: zone?.pincode || cityPincode(locations, locationId),
  };
}

/**
 * Hydrate a picker value from a persisted `location_id` — for edit forms that
 * store only the id. Returns EMPTY_LOCATION until the admin list has loaded.
 */
export function useLocationValueFromId(locationId?: string | null, locality = ''): AdminLocationValue {
  const { locations } = useAdminLocations();
  return useMemo(() => {
    if (!locationId) return EMPTY_LOCATION;
    return buildLocationValue(locations, locationId, locality);
  }, [locations, locationId, locality]);
}
