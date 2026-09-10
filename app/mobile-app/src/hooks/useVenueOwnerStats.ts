import { useCallback, useEffect, useState } from 'react';
import { emptyVenueOwnerStats, type VenueOwnerStats } from '@duncit/utils';

import { VenueOwnerStatsDocument } from '@/graphql/venue-pods';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

/**
 * The owner's slot figures for the venue the studio is looking at — the RN
 * twin of the Partners console's dashboard tiles (rule 27). Re-fetched when
 * the switcher moves to another venue; zeros until the first answer lands.
 */
export function useVenueOwnerStats(venueId: string | null) {
  const [stats, setStats] = useState<VenueOwnerStats>(emptyVenueOwnerStats);
  const [isLoading, setIsLoading] = useState(true);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!venueId) return undefined;
    let active = true;
    setIsLoading(true);
    graphqlRequest(VenueOwnerStatsDocument, { venue_id: venueId }, { auth: true })
      .then((data) => active && setStats(data.venueOwnerStats))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId, attempt]);

  useRefreshRegistration(refetch);

  return { stats, isLoading };
}
