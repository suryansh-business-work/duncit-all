import { useEffect, useState } from 'react';
import type { AutoPodRow } from '@duncit/utils';

import {
  useAutoPodHostProjection,
  type AutoPodHostProjection,
} from '@/hooks/useAutoPodHostProjection';

export interface AutoPodPricing {
  /** The ticket price as typed — empty while the field is. */
  price: string;
  setPrice: (next: string) => void;
  amount: number;
  spots: number;
  setSpots: (next: number) => void;
  projection: AutoPodHostProjection | null;
  loading: boolean;
  failed: boolean;
  /** Both numbers sit in the range the server would accept. */
  inRange: boolean;
  /** The host would take something home at these numbers. */
  viable: boolean;
}

/**
 * A host's own numbers on one offer, priced by the SERVER on every change —
 * the same `autoPodHostProjection` waterfall the assignment itself is judged
 * on, which is why "you earn" here can never differ from what the save allows.
 *
 * Shared by the read-only "View Potential Earnings" sheet and the assign sheet,
 * so the figure a host reads on a card is the figure they commit to (rule 34).
 * The RN twin of `@duncit/auto-pods`' `useHostProjection` (rule 27).
 */
export function useAutoPodPricing(row: AutoPodRow | null): AutoPodPricing {
  const [price, setPrice] = useState('');
  const [spots, setSpots] = useState(0);
  const autoPodId = row?.id ?? null;
  const seedAmount = row?.pod_amount ?? 0;
  const seedSpots = row?.no_of_spots ?? 0;

  // A different offer is a different set of numbers.
  useEffect(() => {
    setPrice(seedAmount > 0 ? String(seedAmount) : '');
    setSpots(seedSpots);
  }, [autoPodId, seedAmount, seedSpots]);

  const amount = Number(price) || 0;
  const { projection, failed, loading } = useAutoPodHostProjection(autoPodId, amount, spots);
  const inRange = !!projection && spots >= projection.min_spots && spots <= projection.max_spots;

  // The slider has no honest range until the server names one; its first
  // answer is what fills in an offer no host has priced yet.
  useEffect(() => {
    if (projection && spots < projection.min_spots) setSpots(projection.min_spots);
  }, [projection, spots]);

  return {
    price,
    setPrice,
    amount,
    spots,
    setSpots,
    projection,
    loading,
    failed,
    inRange,
    viable: !!projection && projection.viable && inRange,
  };
}
