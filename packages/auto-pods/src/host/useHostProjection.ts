import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { AUTO_POD_HOST_PROJECTION } from '../queries';
import type { AutoPodHostProjection } from './HostProjectionLines';

interface ProjectionData {
  autoPodHostProjection: AutoPodHostProjection;
}

export interface HostProjectionState {
  /** The ticket price the host typed, as typed — empty while the field is. */
  price: string;
  setPrice: (value: string) => void;
  amount: number;
  spots: number;
  setSpots: (value: number) => void;
  projection: AutoPodHostProjection | null;
  loading: boolean;
  /** Both numbers are in the range the server would accept. */
  inRange: boolean;
  /** The host would take something home at these numbers. */
  viable: boolean;
  /** What the host keeps at these numbers, or null while they do not work. */
  hostReceives: number | null;
  /** The price field holds something that is not a positive number. */
  priceInvalid: boolean;
}

/**
 * The host's own numbers on one offer, priced by the SERVER on every change —
 * the same `autoPodHostProjection` waterfall the assignment itself is judged
 * on, which is why "you earn" here can never differ from what the save allows.
 *
 * Shared by the read-only "View Potential Earnings" calculator and the assign
 * dialog, so the figure a host reads on the card is the figure they commit to
 * (rule 34). The spot slider seeds from the offer's own count and settles on
 * the activity's minimum once the server has named the real bounds.
 */
export function useHostProjection(
  autoPodId: string | null,
  seed: { pod_amount: number; no_of_spots: number },
  active: boolean
): HostProjectionState {
  const [price, setPrice] = useState('');
  const [spots, setSpots] = useState(0);

  // A different offer is a different set of numbers.
  useEffect(() => {
    setPrice(seed.pod_amount > 0 ? String(seed.pod_amount) : '');
    setSpots(seed.no_of_spots);
  }, [autoPodId, seed.pod_amount, seed.no_of_spots]);

  const amount = Number(price) || 0;
  const query = useQuery<ProjectionData>(AUTO_POD_HOST_PROJECTION, {
    variables: { auto_pod_doc_id: autoPodId ?? '', pod_amount: amount, no_of_spots: spots },
    skip: !active || !autoPodId || amount <= 0 || spots <= 0,
    fetchPolicy: 'network-only',
  });
  const projection = query.data?.autoPodHostProjection ?? null;
  const inRange = !!projection && spots >= projection.min_spots && spots <= projection.max_spots;

  // The slider has no honest range until the server names one; its first
  // answer is what fills in an offer no host has priced yet.
  useEffect(() => {
    if (projection && spots < projection.min_spots) setSpots(projection.min_spots);
  }, [projection, spots]);

  // One expression answers both "does this work" and "what is it worth", so
  // the two can never disagree about the same numbers.
  const hostReceives = projection && projection.viable && inRange ? projection.host_receives : null;

  return {
    price,
    setPrice,
    amount,
    spots,
    setSpots,
    projection,
    loading: query.loading,
    inRange,
    viable: hostReceives !== null,
    hostReceives,
    priceInvalid: price.trim() !== '' && amount <= 0,
  };
}
