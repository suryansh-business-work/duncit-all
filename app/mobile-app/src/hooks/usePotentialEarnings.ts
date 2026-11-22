import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import type { HostOfferModel } from '@duncit/utils';

import { hostOfferModelEnum } from '@/components/venue-offer/offer-terms-input';
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
 * that minimum (`offerEarningsArgs`), so the answer carries the take-home there
 * — with the offer's model and hours, which pick the venue's minimum business.
 */
export interface EarningsVenueArgs {
  venue_amount: number | null;
  venue_commission_on_top: number | null;
  min_spots?: number;
  venue_amount_at_min?: number;
  venue_commission_on_top_at_min?: number;
  venue_offer_model?: HostOfferModel;
  venue_hours?: number;
}

/** One answer and the request it answers: a failure answers with no projection. */
interface Answer {
  key: string;
  projection: PodEarningsProjection | null;
}

/** Debounced server-computed potential-earnings projection for the pricing
 * panel. The SERVER bills payable spots (total − 1, because the host's own seat
 * is free), so nothing is multiplied here. Skips pods with nothing billable — a
 * free pod, or a 1-spot pod that is only the host's own free seat. `venue` null
 * prices the pod with no venue.
 *
 * A projection only counts while it answers the inputs on screen: a new price,
 * spot count or venue term hides the old one at once (`isLoading` until the new
 * answer lands), and a failed request leaves NO projection (`failed`) rather
 * than the last one — nothing stale can enable Create Pod. `retry` asks again. */
export function usePotentialEarnings(
  podAmount: number,
  noOfSpots: number,
  venueId: string | null,
  venue: EarningsVenueArgs | null,
) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Read as values, so a caller rebuilding the object each render never re-asks.
  const venueAmount = venue?.venue_amount ?? null;
  const commissionOnTop = venue?.venue_commission_on_top ?? null;
  const minSpots = venue?.min_spots ?? 0;
  const amountAtMin = venue?.venue_amount_at_min ?? null;
  const commissionAtMin = venue?.venue_commission_on_top_at_min ?? null;
  const offerModel = hostOfferModelEnum(venue?.venue_offer_model);
  const hours = venue?.venue_hours ?? null;
  const idle = podAmount <= 0 || noOfSpots <= 1;
  // Every value the request is asked with, and which retry it is.
  const key = JSON.stringify([
    podAmount,
    noOfSpots,
    venueId,
    venueAmount,
    commissionOnTop,
    minSpots,
    amountAtMin,
    commissionAtMin,
    offerModel,
    hours,
    attempt,
  ]);

  useEffect(() => {
    if (idle) return undefined;
    let active = true;
    // The low end goes only when the offer names a minimum below the spots.
    const atMinimum =
      minSpots > 0
        ? {
            min_spots: minSpots,
            venue_amount_at_min: amountAtMin,
            venue_commission_on_top_at_min: commissionAtMin,
          }
        : {};
    // A venue offer's model and hours, so the verdict holds it to the venue's minimum business.
    const booking = offerModel ? { venue_offer_model: offerModel, venue_hours: hours } : {};
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
          ...booking,
        },
        { auth: true },
      )
        .then((res) => {
          if (active) setAnswer({ key, projection: res.potentialPodEarnings });
        })
        .catch((error: unknown) => {
          logs.mobileApp.warn('usePotentialEarnings', 'preview', { error });
          if (active) setAnswer({ key, projection: null });
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    key,
    idle,
    podAmount,
    noOfSpots,
    venueId,
    venueAmount,
    commissionOnTop,
    minSpots,
    amountAtMin,
    commissionAtMin,
    offerModel,
    hours,
  ]);

  const current = !idle && answer?.key === key ? answer : null;
  const projection = current?.projection ?? null;
  return {
    projection,
    waterfall: projection?.waterfall ?? null,
    isLoading: !idle && current === null,
    failed: current !== null && projection === null,
    retry: () => setAttempt((count) => count + 1),
  };
}
