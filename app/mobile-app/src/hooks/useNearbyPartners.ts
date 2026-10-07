import { useCallback, useState } from 'react';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import type { PodRequestStatus } from '@duncit/utils';

import { PartnerSide } from '@/generated/graphql/graphql';
import { PodRequestQuotaDocument, SendPodPartnerRequestDocument } from '@/graphql/pod-requests';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/** One search result, host or venue, in the shape the card draws. */
export interface NearbyItem {
  id: string;
  kind: 'HOST' | 'VENUE';
  name: string;
  imageUrl: string;
  /** Category for a venue, categories for a host. */
  category: string;
  /** Locality and city — venues only. */
  place: string;
  distanceKm: number;
  /** Set while this pair already has a live request: the card shows it instead of the CTA. */
  openStatus: PodRequestStatus | null;
}

type Quota = ResultOf<typeof PodRequestQuotaDocument>['podPartnerRequestQuota'];
export type SendPodRequestInput = VariablesOf<typeof SendPodPartnerRequestDocument>['input'];

/**
 * A nearby search's results and this month's sending allowance, with the
 * send that refreshes both. `fetchItems` must be memoised on the search's own
 * keys — it is what decides when the search re-runs. The two screens differ
 * only in what they fetch (mWeb twin: NearbyHostsPage / NearbyVenuesPage).
 */
export function useNearbyPartners(
  fetchItems: () => Promise<NearbyItem[]>,
  enabled: boolean,
  side: PartnerSide,
  quotaVenueId: string | null,
) {
  const { t } = useTranslation();
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) =>
    setError(toErrorMessage(err, t('mweb.account.somethingWentWrong')));

  const loadItems = useCallback(async () => {
    setItems(await fetchItems());
    setError(null);
  }, [fetchItems]);
  const loadQuota = useCallback(async () => {
    const res = await graphqlRequest(
      PodRequestQuotaDocument,
      { side, venue_id: quotaVenueId },
      { auth: true },
    );
    setQuota(res.podPartnerRequestQuota);
  }, [side, quotaVenueId]);

  const list = useReloadableQuery(loadItems, { enabled, onError: fail });
  const quotaQuery = useReloadableQuery(loadQuota, {
    enabled: side === PartnerSide.Host || !!quotaVenueId,
    onError: fail,
  });

  /** Sends the request; throws with the server's refusal (LIMIT_REACHED, CONFLICT). */
  const send = async (input: SendPodRequestInput) => {
    await graphqlRequest(SendPodPartnerRequestDocument, { input }, { auth: true });
    await Promise.all([list.refetch(), quotaQuery.refetch()]);
  };

  return { items, quota, error, isLoading: enabled && list.isLoading, send };
}
