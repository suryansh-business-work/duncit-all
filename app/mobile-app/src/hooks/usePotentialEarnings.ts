import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { PotentialPodEarningsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type PodEarningsProjection = ResultOf<
  typeof PotentialPodEarningsDocument
>['potentialPodEarnings'];

export type PotentialEarnings = PodEarningsProjection['waterfall'];

/**
 * The venue's money `potentialPodEarnings` is asked with: a held slot's price
 * (no commission on top), or a venue offer's payout and Duncit's commission on
 * top at the pod's spots — and, when the venue's minimum is fewer, the same at
 * that minimum (`offerEarningsArgs`), so the answer carries the take-home there.
 */
export interface EarningsVenueArgs {
  venue_amount: number | null;
  venue_commission_on_top: number | null;
  min_spots?: number;
  venue_amount_at_min?: number;
  venue_commission_on_top_at_min?: number;
}

/** Debounced server-computed potential-earnings projection for the pricing
 * panel. The SERVER bills payable spots (total − 1, because the host's own seat
 * is free), so nothing is multiplied here. Skips pods with nothing billable — a
 * free pod, or a 1-spot pod that is only the host's own free seat. `venue` null
 * prices the pod with no venue. */
export function usePotentialEarnings(
  podAmount: number,
  noOfSpots: number,
  venueId: string | null,
  venue: EarningsVenueArgs | null,
) {
  const [projection, setProjection] = useState<PodEarningsProjection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Read as values, so a caller rebuilding the object each render never re-asks.
  const venueAmount = venue?.venue_amount ?? null;
  const commissionOnTop = venue?.venue_commission_on_top ?? null;
  const minSpots = venue?.min_spots ?? 0;
  const amountAtMin = venue?.venue_amount_at_min ?? null;
  const commissionAtMin = venue?.venue_commission_on_top_at_min ?? null;

  useEffect(() => {
    if (podAmount <= 0 || noOfSpots <= 1) {
      setProjection(null);
      setIsLoading(false);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    // The low end goes only when the offer names a minimum below the spots.
    const atMinimum =
      minSpots > 0
        ? {
            min_spots: minSpots,
            venue_amount_at_min: amountAtMin,
            venue_commission_on_top_at_min: commissionAtMin,
          }
        : {};
    const timer = setTimeout(() => {
      graphqlRequest(
        PotentialPodEarningsDocument,
        {
          pod_amount: podAmount,
          no_of_spots: noOfSpots,
          venue_id: venueId,
          venue_amount: venueAmount,
          venue_commission_on_top: commissionOnTop,
          ...atMinimum,
        },
        { auth: true },
      )
        .then((res) => {
          if (active) setProjection(res.potentialPodEarnings);
        })
        .catch((error: unknown) =>
          logs.mobileApp.warn('usePotentialEarnings', 'preview', { error }),
        )
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    podAmount,
    noOfSpots,
    venueId,
    venueAmount,
    commissionOnTop,
    minSpots,
    amountAtMin,
    commissionAtMin,
  ]);

  return { projection, waterfall: projection?.waterfall ?? null, isLoading };
}
