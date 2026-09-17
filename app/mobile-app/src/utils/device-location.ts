import * as Location from 'expo-location';

import { matchLocation, matchZone, type MatchableLocation } from './location-match';

/** What asking the device for its place came to. */
export type DeviceLocationResult<T> =
  | { status: 'DENIED' }
  | { status: 'UNSERVED'; city: string }
  | { status: 'FOUND'; city: string; location: T; zone: string };

/**
 * Ask the OS where this device is and match it to one of `locations` — a city,
 * and the area in it when the postcode names one (`zone` is '' otherwise).
 * The location picker's "Use my location" and create-pod's Locality section
 * both come here. A failed fix or geocode throws. mWeb twin: useGeoLocation +
 * gps-match.
 */
export async function detectDeviceLocation<T extends MatchableLocation>(
  locations: T[],
): Promise<DeviceLocationResult<T>> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return { status: 'DENIED' };
  const position = await Location.getCurrentPositionAsync({});
  const [geo] = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const city = geo?.city ?? geo?.subregion ?? '';
  const location = matchLocation(locations, city, geo?.postalCode);
  if (!location) return { status: 'UNSERVED', city };
  return { status: 'FOUND', city, location, zone: matchZone(location, geo?.postalCode) };
}
