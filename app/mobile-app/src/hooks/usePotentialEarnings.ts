import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PotentialPodEarningsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type PotentialEarnings = ResultOf<
  typeof PotentialPodEarningsDocument
>['potentialPodEarnings'];

/** Debounced server-computed potential-earnings waterfall for the pricing
 * panel. Skips free pods (amount ≤ 0); venue args come from the picked slot. */
export function usePotentialEarnings(
  amount: number,
  venueId: string | null,
  venueAmount: number | null,
) {
  const [waterfall, setWaterfall] = useState<PotentialEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (amount <= 0) {
      setWaterfall(null);
      setIsLoading(false);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        PotentialPodEarningsDocument,
        { amount, venue_id: venueId, venue_amount: venueAmount },
        { auth: true },
      )
        .then((res) => {
          if (active) setWaterfall(res.potentialPodEarnings);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [amount, venueId, venueAmount]);

  return { waterfall, isLoading };
}
