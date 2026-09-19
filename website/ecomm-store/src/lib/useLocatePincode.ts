import { useState } from 'react';
import { useQuery } from '@apollo/client/react';

import { PUBLIC_CLIENT_CONFIG } from '../graphql/settings';
import { storeLog } from './log';

export type LocateFailure = 'DENIED' | 'NO_PINCODE' | 'FAILED';

export type LocateState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'located'; place: string; pincode: string; lat: number; lng: number }
  | { status: 'failed'; reason: LocateFailure; place: string };

interface AddressComponent {
  long_name: string;
  types: string[];
}

interface GeocodeResponse {
  status: string;
  results?: { address_components?: AddressComponent[] }[];
}

const PLACE_TYPES = ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1'];
const POSTAL_TYPES = ['postal_code'];
const PERMISSION_DENIED = 1;
const IDLE: LocateState = { status: 'idle' };

/** The first component of any of the given types, in order of preference. */
function componentOf(components: AddressComponent[], types: string[]): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return '';
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });
}

const permissionDenied = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === PERMISSION_DENIED;

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<AddressComponent[]> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  const json = (await response.json()) as GeocodeResponse;
  const first = json.results?.[0];
  if (json.status !== 'OK' || !first) throw new Error(`geocode ${json.status}`);
  return first.address_components ?? [];
}

/**
 * "Use my location": the browser's position, reverse-geocoded through Google
 * into a locality and a pincode. The key comes from the platform's public
 * client config; without one `available` is false and the caller hides the button.
 */
export function useLocatePincode() {
  const { data } = useQuery(PUBLIC_CLIENT_CONFIG, { fetchPolicy: 'cache-first' });
  const apiKey = data?.publicClientConfig.google_maps_api_key ?? '';
  const [state, setState] = useState<LocateState>(IDLE);

  /** Resolves to the pincode found, or '' when it could not be. */
  const locate = async (): Promise<string> => {
    setState({ status: 'busy' });
    let coords: GeolocationCoordinates;
    try {
      coords = (await currentPosition()).coords;
    } catch (error) {
      setState({ status: 'failed', reason: permissionDenied(error) ? 'DENIED' : 'FAILED', place: '' });
      return '';
    }
    try {
      const components = await reverseGeocode(coords.latitude, coords.longitude, apiKey);
      const place = componentOf(components, PLACE_TYPES);
      const pincode = componentOf(components, POSTAL_TYPES);
      if (!pincode) {
        setState({ status: 'failed', reason: 'NO_PINCODE', place });
        return '';
      }
      setState({ status: 'located', place, pincode, lat: coords.latitude, lng: coords.longitude });
      return pincode;
    } catch (error) {
      storeLog.warn('pincode', 'reverseGeocode', { error });
      setState({ status: 'failed', reason: 'FAILED', place: '' });
      return '';
    }
  };

  const available = apiKey !== '' && globalThis.navigator !== undefined && 'geolocation' in globalThis.navigator;
  return { available, state, locate };
}
