import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueEarningsDocument } from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';

type Data = ResultOf<typeof VenueEarningsDocument>;
export type VenueEarningsSummary = Data['myVenueEarningsSummary'];
export type VenuePayout = Data['myVenuePayouts'][number];

/** Venue Earnings — summary tiles + payout history across the owner's venues. */
export function useVenueEarnings() {
  const [summary, setSummary] = useState<VenueEarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<VenuePayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await graphqlRequest(VenueEarningsDocument, undefined, { auth: true });
    setSummary(res.myVenueEarningsSummary);
    setPayouts(res.myVenuePayouts);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return { summary, payouts, isLoading, refetch: load };
}
