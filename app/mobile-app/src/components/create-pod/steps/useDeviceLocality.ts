import { useEffect, useRef, useState } from 'react';
import { logs } from '@duncit/logs';

import { detectDeviceLocation } from '@/utils/device-location';
import type { CreatePodLocation } from '../create-pod.types';

/**
 * The city and area this device is in, looked up once and handed to `onFound`
 * when it names one of our cities. mWeb twin.
 *
 * `enabled` is read for the first lookup only: a form resumed with a locality
 * already chosen never asks for the device's.
 */
export function useDeviceLocality(
  locations: CreatePodLocation[],
  enabled: boolean,
  onFound: (locationId: string, locality: string) => void,
) {
  const [detecting, setDetecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current || locations.length === 0) return;
    requested.current = true;
    setDetecting(true);
    detectDeviceLocation(locations)
      .then((result) => {
        if (result.status === 'FOUND') onFound(result.location.id, result.zone);
        else setFailed(true);
      })
      .catch((error: unknown) => {
        setFailed(true);
        logs.mobileApp.error('create-pod', 'device-locality', { error });
      })
      .finally(() => setDetecting(false));
  }, [enabled, locations, onFound]);

  return { detecting, failed };
}
