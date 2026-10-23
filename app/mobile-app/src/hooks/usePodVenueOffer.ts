import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import {
  AcceptVenueCounterOfferDocument,
  PodVenueOfferDocument,
  RejectVenueCounterOfferDocument,
} from '@/graphql/venue-offer';
import { graphqlRequest } from '@/services/graphql.client';

export type PodVenueOffer = NonNullable<ResultOf<typeof PodVenueOfferDocument>['podVenueOffer']>;

/**
 * A pod's offer to its venue, for the host's pending screen, and the host's
 * two answers to a venue counter: accept (the booking is confirmed) and reject
 * (the hold is released). Each answer re-reads the offer; a refused answer is
 * kept in `error` for the card to show. mWeb twin: VenueOfferCard's queries.
 */
export function usePodVenueOffer(podId: string) {
  const [offer, setOffer] = useState<PodVenueOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!podId) return;
    try {
      const res = await graphqlRequest(PodVenueOfferDocument, { pod_id: podId }, { auth: true });
      setOffer(res.podVenueOffer ?? null);
    } catch (err: unknown) {
      logs.mobileApp.warn('usePodVenueOffer', 'load', { error: err, pod_id: podId });
    }
  }, [podId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const answer = async (run: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await run();
      await load();
      return true;
    } catch (err: unknown) {
      setError(err);
      logs.mobileApp.warn('usePodVenueOffer', 'answer', { error: err, pod_id: podId });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    offer,
    busy,
    error,
    accept: () =>
      answer(() =>
        graphqlRequest(AcceptVenueCounterOfferDocument, { pod_id: podId }, { auth: true }),
      ),
    reject: (reason: string) =>
      answer(() =>
        graphqlRequest(
          RejectVenueCounterOfferDocument,
          { pod_id: podId, reason: reason || null },
          { auth: true },
        ),
      ),
  };
}
