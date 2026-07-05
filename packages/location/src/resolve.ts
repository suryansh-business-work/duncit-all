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

/** Build a picker value from persisted country/state/city NAME strings — for
 * forms (e.g. profiles) that store names rather than a location_id. */
export function buildLocationValueFromNames(
  locations: LocationDoc[],
  names: { country?: string; state?: string; city?: string; locality?: string },
): AdminLocationValue {
  const lc = (value?: string) => (value ?? '').toLowerCase();
  const doc = names.city
    ? locations.find(
        (loc) =>
          lc(loc.city) === lc(names.city) &&
          (!names.state || lc(loc.state) === lc(names.state)) &&
          (!names.country || lc(loc.country) === lc(names.country)),
      )
    : undefined;
  if (doc) return buildLocationValue(locations, doc.id, names.locality ?? '');
  // No admin match — surface the saved names so the field isn't silently blank.
  return {
    ...EMPTY_LOCATION,
    country: names.country ?? '',
    state: names.state ?? '',
    city: names.city ?? '',
    locality: names.locality ?? '',
  };
}
