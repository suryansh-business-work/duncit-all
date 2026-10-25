import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { createLogger } from '@duncit/logs';
import { newestOfferLineId, type VenueChatLine } from '@duncit/utils';
import { POD_VENUE_OFFER_TERMS, type PodOffer } from './queries';

const logger = createLogger('portal');

/**
 * A pod's live venue offer (`podVenueOffer`) — its hosts and the venue's owner
 * both read it. Null for a pod without one, and once an offer is declined or
 * ran out. `refetch` re-reads it after an answer.
 */
export function usePodVenueOffer(podId: string | null | undefined) {
  const { data, loading, error, refetch } = useQuery<{ podVenueOffer: PodOffer | null }>(POD_VENUE_OFFER_TERMS, {
    variables: { pod_id: podId ?? '' },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  return { offer: data?.podVenueOffer ?? null, loading: loading && !data, error, refetch };
}

/**
 * The live offer beside a venue chat: read once the thread's first page is in
 * (`ready`), and re-read whenever a new OFFER line arrives — someone moved, so
 * the terms and whose turn it is changed. The thread's newest offer line is the
 * only one that may still be answered.
 */
export function useChatVenueOffer(
  podId: string | null | undefined,
  lines: readonly Pick<VenueChatLine, 'id' | 'type' | 'offer'>[],
  ready: boolean,
) {
  const live = usePodVenueOffer(podId);
  const newestId = useMemo(() => newestOfferLineId(lines), [lines]);
  const { refetch } = live;
  // undefined until the first page is in: the lines it loads with are what the first read already saw.
  const seen = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    const before = seen.current;
    seen.current = newestId;
    if (before === undefined || before === newestId) return;
    refetch().catch((error: unknown) => logger.warn('venueOffer', 'chatRefresh', { error, pod_id: podId }));
  }, [ready, newestId, refetch, podId]);

  return { offer: live.offer, newestId, refresh: refetch };
}
