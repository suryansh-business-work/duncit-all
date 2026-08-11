import { useCallback } from 'react';
import * as Location from 'expo-location';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { PodFeedbackInput } from '@duncit/utils';

import {
  MobileActiveSosDocument,
  MobileMyCallbacksDocument,
  MobilePendingPodFeedbackDocument,
  MobilePodFeedbackFormDocument,
  MobileRaiseSosDocument,
  MobileRequestCallbackDocument,
  MobileSubmitFeedbackDocument,
  MobileSupportCallTargetDocument,
} from '@/graphql/bouncer';
import { graphqlRequest } from '@/services/graphql.client';

export type ActiveSos = ResultOf<typeof MobileActiveSosDocument>['myActiveBouncerSos'];
export type CallbackHistoryItem = ResultOf<
  typeof MobileMyCallbacksDocument
>['myCallbackRequests'][number];
export type PendingPodFeedback = ResultOf<
  typeof MobilePendingPodFeedbackDocument
>['myPendingPodFeedback'];
export type PodFeedbackForm = ResultOf<typeof MobilePodFeedbackFormDocument>['podFeedbackForm'];

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

  const listMyCallbacks = useCallback(
    (): Promise<CallbackHistoryItem[]> =>
      graphqlRequest(MobileMyCallbacksDocument, undefined, { auth: true }).then(
        (d) => d.myCallbackRequests,
      ),
    [],
  );

  const getPendingPodFeedback = useCallback(
    (): Promise<PendingPodFeedback> =>
      graphqlRequest(MobilePendingPodFeedbackDocument, undefined, { auth: true }).then(
        (d) => d.myPendingPodFeedback,
      ),
    [],
  );

  // The rating form behind the link a host shares: the parts this pod can be
  // rated on, plus whatever this guest already said about it.
  const getPodFeedbackForm = useCallback(
    (podId: string): Promise<PodFeedbackForm> =>
      graphqlRequest(MobilePodFeedbackFormDocument, { pod_id: podId }, { auth: true }).then(
        (d) => d.podFeedbackForm,
      ),
    [],
  );

  // The input is built by @duncit/utils so mWeb and native send the same shape;
  // the category is left out on purpose — the server reads it from the weakest
  // score rather than asking the guest to triage their own feedback.
  const submitPodFeedback = useCallback(async (input: PodFeedbackInput) => {
    await graphqlRequest(MobileSubmitFeedbackDocument, { input: input as never }, { auth: true });
  }, []);

  return {
    loadSupportTarget,
    getActiveSos,
    raiseSos,
    requestCallback,
    listMyCallbacks,
    getPendingPodFeedback,
    getPodFeedbackForm,
    submitPodFeedback,
  };
}
