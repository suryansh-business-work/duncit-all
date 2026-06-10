import { useState } from 'react';
import { getGoogleMapsApiKey } from '../../config/runtimeConfig';

export interface GeocodedAddress {
  city: string;
  state: string;
  country: string;
  pincode: string;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function findComponent(
  components: GoogleAddressComponent[],
  types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return '';
}

async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string
): Promise<GeocodedAddress> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not reach Google geocoder');
  const json: any = await res.json();
  if (json.status !== 'OK' || !Array.isArray(json.results) || json.results.length === 0) {
    throw new Error(json.error_message || 'Could not resolve your location');
  }
  const components: GoogleAddressComponent[] = json.results[0].address_components ?? [];
  return {
    city: findComponent(components, ['locality', 'postal_town', 'administrative_area_level_2']),
    state: findComponent(components, ['administrative_area_level_1']),
    country: findComponent(components, ['country']),
    pincode: findComponent(components, ['postal_code']),
  };
}

export interface UseGeoLocationResult {
  busy: boolean;
  error: string | null;
  geocoded: GeocodedAddress | null;
  request: () => Promise<void>;
  reset: () => void;
}

export function useGeoLocation(): UseGeoLocationResult {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) throw new Error('Map API key is not configured');
      if (!('geolocation' in navigator)) throw new Error('Geolocation is not supported in this browser');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });
      const addr = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
        apiKey
      );
      setGeocoded(addr);
    } catch (err: any) {
      if (err?.code === 1) setError('Location permission was denied');
      else if (err?.code === 2) setError('Could not determine your location');
      else if (err?.code === 3) setError('Timed out while getting your location');
      else setError(err?.message ?? 'Could not get your location');
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    error,
    geocoded,
    request,
    reset: () => {
      setGeocoded(null);
      setError(null);
    },
  };
}
