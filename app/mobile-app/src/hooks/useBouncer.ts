import { useCallback } from 'react';
import * as Location from 'expo-location';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileActiveSosDocument,
  MobileRaiseSosDocument,
  MobileRequestCallbackDocument,
  MobileSupportCallTargetDocument,
} from '@/graphql/bouncer';
import { graphqlRequest } from '@/services/graphql.client';

export type ActiveSos = ResultOf<typeof MobileActiveSosDocument>['myActiveBouncerSos'];

/** Best-effort current location for an SOS — null if permission denied/unavailable. */
async function captureLocation(): Promise<{
  lat: number;
  lng: number;
  accuracy?: number | null;
} | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch {
    return null;
  }
}

/** Thin action layer over the bouncer/support mutations — RN twin of mWeb's
 * SosContent/CallbackContent data calls. */
export function useBouncer() {
  const loadSupportTarget = useCallback(
    () => graphqlRequest(MobileSupportCallTargetDocument, undefined, { auth: true }),
    [],
  );

  const getActiveSos = useCallback(
    (podId: string): Promise<ActiveSos> =>
      graphqlRequest(MobileActiveSosDocument, { pod_id: podId }, { auth: true }).then(
        (d) => d.myActiveBouncerSos,
      ),
    [],
  );

  const raiseSos = useCallback(async (podId: string, message: string) => {
    const location = await captureLocation();
    await graphqlRequest(
      MobileRaiseSosDocument,
      { input: { pod_id: podId, message: message.trim() || null, location } },
      { auth: true },
    );
  }, []);

  const requestCallback = useCallback(async (podId: string | null, reason: string) => {
    await graphqlRequest(
      MobileRequestCallbackDocument,
      { input: { pod_id: podId, reason: reason.trim() || null } },
      { auth: true },
    );
  }, []);

  return { loadSupportTarget, getActiveSos, raiseSos, requestCallback };
}
