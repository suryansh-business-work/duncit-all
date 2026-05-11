import { useState } from 'react';
import type { GeocodedAddress } from '../../components/app-header/useGeoLocation';

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function pickComponent(
  components: GoogleAddressComponent[],
  types: string[],
  short = false
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return short ? match.short_name : match.long_name;
  }
  return '';
}

export interface VenueGeocodeResult extends GeocodedAddress {
  country_code: string;
  state_code: string;
  formatted_address: string;
  lat: number | null;
  lng: number | null;
}

async function callGeocoder(
  url: string,
  apiKey: string
): Promise<VenueGeocodeResult> {
  const res = await fetch(`${url}&key=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error('Could not reach Google geocoder');
  const json: any = await res.json();
  if (json.status !== 'OK' || !Array.isArray(json.results) || json.results.length === 0) {
    throw new Error(json.error_message || 'No matching place found');
  }
  const top = json.results[0];
  const components: GoogleAddressComponent[] = top.address_components ?? [];
  return {
    city: pickComponent(components, ['locality', 'postal_town', 'administrative_area_level_2']),
    state: pickComponent(components, ['administrative_area_level_1']),
    state_code: pickComponent(components, ['administrative_area_level_1'], true),
    country: pickComponent(components, ['country']),
    country_code: pickComponent(components, ['country'], true),
    pincode: pickComponent(components, ['postal_code']),
    formatted_address: top.formatted_address ?? '',
    lat: top.geometry?.location?.lat ?? null,
    lng: top.geometry?.location?.lng ?? null,
  };
}

export function useVenueGeocoder() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VenueGeocodeResult | null>(null);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAP_API as string | undefined;

  const requireKey = () => {
    if (!apiKey) {
      setError('Map API key is not configured');
      return false;
    }
    return true;
  };

  const fromGps = async () => {
    if (!requireKey()) return;
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported in this browser');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });
      const r = await callGeocoder(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}`,
        apiKey!
      );
      setResult(r);
    } catch (err: any) {
      setError(err?.message ?? 'Could not get your location');
    } finally {
      setBusy(false);
    }
  };

  const fromSearch = async (query: string) => {
    if (!requireKey()) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const r = await callGeocoder(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}`,
        apiKey!
      );
      setResult(r);
    } catch (err: any) {
      setError(err?.message ?? 'Could not find that place');
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    error,
    result,
    fromGps,
    fromSearch,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}
