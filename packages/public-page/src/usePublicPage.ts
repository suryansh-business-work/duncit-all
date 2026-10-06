import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import type { PublicPageInsights, PublicPageKind, PublicPageLink } from '@duncit/utils';
import { createLogger } from '@duncit/logs';
import { MY_PUBLIC_PAGE, PUBLISH_PUBLIC_PAGE } from './queries';

const logger = createLogger('public-page');

/** The reporting window the card opens on: the last 30 days. */
export const DEFAULT_RANGE_DAYS = 30;

/**
 * The owner's page: its link and numbers for the chosen period, and the
 * publish action. A venue page needs the venue id; a host page is always the
 * signed-in host's own, so it needs none.
 */
export function usePublicPage(kind: PublicPageKind, refId?: string | null) {
  const [days, setDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const skip = kind === 'VENUE' && !refId;
  const query = useQuery<{ myPublicPage: PublicPageInsights }>(MY_PUBLIC_PAGE, {
    variables: { kind, refId: refId ?? null, days },
    fetchPolicy: 'cache-and-network',
    skip,
  });
  const [publishMutation, publishState] = useMutation<{ publishPublicPage: PublicPageLink }>(
    PUBLISH_PUBLIC_PAGE,
  );

  /** The failure is shown from the mutation's own error state; it is logged here. */
  const publish = async () => {
    try {
      await publishMutation({ variables: { kind, refId: refId ?? null } });
      await query.refetch();
    } catch (error) {
      logger.error('publicPage', 'publish', { error, kind });
    }
  };

  return {
    insights: query.data?.myPublicPage ?? null,
    loading: query.loading && !query.data,
    error: query.error,
    retry: () => query.refetch(),
    days,
    setDays,
    publish,
    publishing: publishState.loading,
    publishError: publishState.error,
  };
}
