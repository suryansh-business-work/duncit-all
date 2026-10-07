import { useCallback, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { splitPodRequests } from '@duncit/utils';

import { PartnerSide } from '@/generated/graphql/graphql';
import { MyPodPartnerRequestsDocument } from '@/graphql/pod-requests';
import { usePodRequestActions } from '@/hooks/usePodRequestActions';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type PodRequestRow = ResultOf<
  typeof MyPodPartnerRequestsDocument
>['myPodPartnerRequests'][number];

/**
 * Every Pod Request on one side — Host Studio reads HOST, Venue Studio VENUE
 * (narrowed to the venue its switcher has picked) — split into the received
 * Requests, the accepted ones and the ones this side sent, plus the inline
 * Accept / Decline. mWeb twin: pod-requests/PodRequestsSection.
 */
export function usePodRequests(side: PartnerSide, venueId?: string | null) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PodRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // A venue owner with no venue picked yet has nothing to list.
  const enabled = side === PartnerSide.Host || !!venueId;

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      MyPodPartnerRequestsDocument,
      { side, venue_id: venueId ?? null },
      { auth: true },
    );
    setRequests(res.myPodPartnerRequests);
    setError(null);
  }, [side, venueId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled,
    onError: (err) => setError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });
  const actions = usePodRequestActions(refetch);
  const split = useMemo(() => splitPodRequests(requests), [requests]);

  return { ...split, isLoading: enabled && isLoading, error, actions };
}
