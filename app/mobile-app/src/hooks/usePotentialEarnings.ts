import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PotentialPodEarningsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type PodEarningsProjection = ResultOf<
  typeof PotentialPodEarningsDocument
>['potentialPodEarnings'];

export type PotentialEarnings = PodEarningsProjection['waterfall'];

/** Debounced server-computed potential-earnings projection for the pricing
 * panel. The SERVER bills payable spots (total − 1, because the host's own seat
 * is free), so nothing is multiplied here. Skips pods with nothing billable — a
 * free pod, or a 1-spot pod that is only the host's own free seat. Venue args
 * come from the picked slot. */
export function usePotentialEarnings(
  podAmount: number,
  noOfSpots: number,
  venueId: string | null,
  venueAmount: number | null,
) {
  const [projection, setProjection] = useState<PodEarningsProjection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (podAmount <= 0 || noOfSpots <= 1) {
      setProjection(null);
      setIsLoading(false);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        PotentialPodEarningsDocument,
        {
          pod_amount: podAmount,
          no_of_spots: noOfSpots,
          venue_id: venueId,
          venue_amount: venueAmount,
        },
        { auth: true },
      )
        .then((res) => {
          if (active) setProjection(res.potentialPodEarnings);
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
  }, [podAmount, noOfSpots, venueId, venueAmount]);

  return { projection, waterfall: projection?.waterfall ?? null, isLoading };
}
