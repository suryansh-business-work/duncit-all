import { useEffect, useRef } from 'react';
import { logs } from '@duncit/logs';
import { useGeoLocation } from '../../../../components/app-header/useGeoLocation';
import { matchLocation, matchZone } from '../../../../components/app-header/gps-match';
import type { CreatePodLocation } from '../create-pod.types';

/**
 * The city and area this device is in, looked up once — the same browser fix +
 * reverse geocode the header's "Use my location" runs — and handed to
 * `onFound` when it names one of our cities. Native twin.
 *
 * `enabled` is read for the first lookup only: a form resumed with a locality
 * already chosen never asks for the device's.
 */
export function useDeviceLocality(
  locations: CreatePodLocation[],
  enabled: boolean,
  onFound: (locationId: string, locality: string) => void,
) {
  const { busy, error, geocoded, request } = useGeoLocation();
  const requested = useRef(false);
  const handled = useRef(false);
  const match = geocoded ? matchLocation(locations, geocoded) : null;

  useEffect(() => {
    if (!enabled || requested.current || locations.length === 0) return;
    requested.current = true;
    request().catch((error_: unknown) =>
      logs.mWeb.error('useDeviceLocality', 'request', { error: error_, msg: 'device location lookup failed' }),
    );
  }, [enabled, locations.length, request]);

  useEffect(() => {
    if (!geocoded || !match || handled.current) return;
    handled.current = true;
    onFound(match.id, matchZone(match, geocoded.pincode));
  }, [geocoded, match, onFound]);

  return { detecting: busy, failed: !!error || (!!geocoded && !match) };
}
