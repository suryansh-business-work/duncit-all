import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { payableSpots } from '@duncit/utils';
import { POTENTIAL_POD_EARNINGS, type EarningsProjection } from './queries';

export interface EarningsPreviewInput {
  /** Price of the venue slot the host picked (null when none is picked). */
  slotPrice: number | null;
  podAmount: number;
  noOfSpots: number;
  venueId: string | null;
  isPhysical: boolean;
}

export interface EarningsPreview extends EarningsPreviewInput {
  projection: EarningsProjection | undefined;
  loading: boolean;
  /** The inputs changed but the debounced query has not caught up yet. */
  stale: boolean;
  /** A physical pod with a slot picked — the venue rows apply. */
  hasVenue: boolean;
  /** Both money inputs are set, so a projection can be shown. */
  ready: boolean;
  /** The projected host payout is ₹0 or less at this ticket price. */
  zeroEarnings: boolean;
  /** The pod does not even cover the venue's slot price. */
  venueShortfall: boolean;
  /** Either rule fires — the pod cannot be created. */
  blocked: boolean;
}

/** Ticket price × the spots that can actually be sold (the host sits free). */
export function totalPodValue(podAmount: number, noOfSpots: number): number {
  return podAmount * payableSpots(noOfSpots);
}

/**
 * The venue's slot price is deducted once from the whole collection, so a pod
 * whose entire value is below it can never pay the venue. Computed locally (no
 * server round-trip) so the Create Pod button disables on the keystroke.
 */
export function isVenueShortfall(input: Readonly<EarningsPreviewInput>): boolean {
  const { podAmount, noOfSpots, slotPrice, isPhysical } = input;
  if (!isPhysical || slotPrice === null || slotPrice <= 0) return false;
  if (podAmount <= 0 || noOfSpots <= 1) return false;
  return totalPodValue(podAmount, noOfSpots) < slotPrice;
}

/** Debounced (400ms) copy of the pricing inputs so typing doesn't spam the API.
 * Both are primitives, so the effect only re-runs on a real value change. */
function useDebouncedInputs(podAmount: number, noOfSpots: number) {
  const [inputs, setInputs] = useState({ podAmount, noOfSpots });
  useEffect(() => {
    const t = setTimeout(() => setInputs({ podAmount, noOfSpots }), 400);
    return () => clearTimeout(t);
  }, [podAmount, noOfSpots]);
  return inputs;
}

/**
 * The single source of truth for Step 4's money: the server-owned earnings
 * waterfall plus the two rules that block publishing. Both mirror the server's
 * `assertViablePodEconomics` exactly — a free pod (ticket ₹0) is exempt, the
 * pod must cover the venue's slot price, and the host's projected payout must
 * be positive. mWeb + native apply identical thresholds (rule 27).
 */
export function useEarningsPreview(input: Readonly<EarningsPreviewInput>): EarningsPreview {
  const { slotPrice, podAmount, noOfSpots, venueId, isPhysical } = input;
  const sent = useDebouncedInputs(podAmount, noOfSpots);
  const hasVenue = isPhysical && slotPrice !== null;
  const { data, loading } = useQuery(POTENTIAL_POD_EARNINGS, {
    variables: {
      pod_amount: sent.podAmount,
      no_of_spots: sent.noOfSpots,
      venue_id: hasVenue ? venueId : null,
      venue_amount: hasVenue ? slotPrice : null,
    },
    skip: sent.podAmount <= 0 || sent.noOfSpots <= 1,
    fetchPolicy: 'cache-and-network',
  });
  const projection: EarningsProjection | undefined = data?.potentialPodEarnings;
  const stale = sent.podAmount !== podAmount || sent.noOfSpots !== noOfSpots;

  // Free pods never trip either rule — the ticket price is the switch.
  const ready = podAmount > 0 && noOfSpots > 0;
  const hostReceives = projection?.waterfall.host_receives;
  // Never claim ₹0 earnings from a waterfall that a newer price has superseded.
  const zeroEarnings =
    ready && !loading && !stale && hostReceives !== undefined && hostReceives <= 0;
  const venueShortfall = isVenueShortfall(input);

  return {
    ...input,
    projection,
    loading,
    stale,
    hasVenue,
    ready,
    zeroEarnings,
    venueShortfall,
    blocked: zeroEarnings || venueShortfall,
  };
}
