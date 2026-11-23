import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface LocationFix {
  latitude: number;
  longitude: number;
  /** The radius, in metres, the browser says the fix could be off by. */
  accuracy: number;
}

/** What the server calls a failed request (the `location_error` it records). */
export type LocationErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

const REQUEST_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 };

const STATUS_BY_CODE: Record<number, GeolocationStatus> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };
const ERROR_BY_STATUS: Partial<Record<GeolocationStatus, LocationErrorCode>> = {
  denied: 'PERMISSION_DENIED',
  unavailable: 'POSITION_UNAVAILABLE',
  timeout: 'TIMEOUT',
  unsupported: 'UNSUPPORTED',
};

/** The error code to record for a status that failed, or null when nothing failed. */
export const locationErrorFor = (status: GeolocationStatus): LocationErrorCode | null => ERROR_BY_STATUS[status] ?? null;

/**
 * The browser's location permission, as one small state machine.
 *
 * Nothing is requested until `request()` — the person presses the button, so
 * the browser's own prompt appears for a reason they can see. If the browser
 * already remembers a "granted" answer, the fix is taken on load: asking
 * someone to press a button for a thing they already allowed is only friction.
 *
 * Every attempt is a FRESH fix (`maximumAge: 0`); a cached position from an
 * earlier session would record a place the person is no longer in.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>(() => ('geolocation' in navigator ? 'idle' : 'unsupported'));
  const [fix, setFix] = useState<LocationFix | null>(null);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (unmounted.current) return;
        setFix({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus('granted');
      },
      (failure) => {
        if (unmounted.current) return;
        setFix(null);
        setStatus(STATUS_BY_CODE[failure.code] ?? 'unavailable');
      },
      REQUEST_OPTIONS,
    );
  }, []);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (result.state === 'granted' && !unmounted.current) request();
      })
      // Browsers that cannot answer simply wait for the button.
      .catch(() => undefined);
  }, [request]);

  return { status, fix, request };
}
