import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { payableSpots, type OfferEarningsArgs } from '@duncit/utils';
import { POTENTIAL_POD_EARNINGS, type EarningsProjection } from './queries';

export interface EarningsPreviewInput {
  /** What the venue costs the pod (null when nothing is booked): the offer's
   * quoted total at the pod's spots, or a Pod Request's held slot price. */
  slotPrice: number | null;
  /** A venue offer's money as `potentialPodEarnings` takes it
   * (`offerEarningsArgs`): what the venue is paid (venue price + GST) and
   * Duncit's commission on top, which comes off the host's side, at the pod's
   * spots — and the same at the venue's minimum guests when that is fewer, so
   * the host sees a range. Absent for a held slot. */
  offerEarnings?: OfferEarningsArgs | null;
  podAmount: number;
  noOfSpots: number;
  venueId: string | null;
  isPhysical: boolean;
  /** A FREE pod is the only pod allowed to carry no ticket price. */
  isFree: boolean;
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
  /** A paid pod with no ticket price entered yet — nothing to project. */
  priceMissing: boolean;
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

/** The venue arguments the projection is asked with: an offer's money (at
 * both ends of its guests), a held slot's price, or none. */
function venueArgsOf(hasVenue: boolean, slotPrice: number | null, offerEarnings: OfferEarningsArgs | null | undefined) {
  if (!hasVenue) return { venue_amount: null, venue_commission_on_top: null };
  return offerEarnings ?? { venue_amount: slotPrice, venue_commission_on_top: null };
}

/**
 * The single source of truth for Step 4's money: the server-owned earnings
 * waterfall plus the two rules that block publishing. Both mirror the server's
 * `assertViablePodEconomics` exactly — a free pod (ticket ₹0) is exempt, the
 * pod must cover the venue's cost at its spots, and the host's projected
 * payout at its spots must be positive. The take-home at the venue's minimum
 * guests (`projection.minimum`) is shown as the low end of a range, never a
 * block: the server does not refuse on it. mWeb + native apply identical
 * thresholds (rule 27).
 */
export function useEarningsPreview(input: Readonly<EarningsPreviewInput>): EarningsPreview {
  const { slotPrice, offerEarnings, podAmount, noOfSpots, venueId, isPhysical, isFree } = input;
  const sent = useDebouncedInputs(podAmount, noOfSpots);
  const hasVenue = isPhysical && slotPrice !== null;
  const { data, loading } = useQuery<{ potentialPodEarnings: EarningsProjection }>(POTENTIAL_POD_EARNINGS, {
    variables: {
      pod_amount: sent.podAmount,
      no_of_spots: sent.noOfSpots,
      venue_id: hasVenue ? venueId : null,
      ...venueArgsOf(hasVenue, slotPrice, offerEarnings),
    },
    // A free pod has no calculation at all — its ₹0 would skip the query
    // anyway, but the debounced copy still holds the old price for 400ms after
    // the host switches Paid → Free, so the type is checked on its own.
    skip: isFree || sent.podAmount <= 0 || sent.noOfSpots <= 1,
    fetchPolicy: 'cache-and-network',
  });
  // Whatever an earlier paid price left behind, a free pod has no projection.
  const projection: EarningsProjection | undefined = isFree ? undefined : data?.potentialPodEarnings;
  const stale = sent.podAmount !== podAmount || sent.noOfSpots !== noOfSpots;

  // Free pods never trip any rule — the ticket price is the switch.
  const ready = !isFree && podAmount > 0 && noOfSpots > 0;
  // The field starts blank, so a paid pod has nothing to publish until the host
  // types a price — ₹0 is never assumed on their behalf.
  const priceMissing = !isFree && podAmount <= 0;
  const hostReceives = projection?.waterfall.host_receives;
  // Never claim ₹0 earnings from a waterfall that a newer price has superseded.
  const zeroEarnings =
    ready && !loading && !stale && hostReceives !== undefined && hostReceives <= 0;
  const venueShortfall = !isFree && isVenueShortfall(input);

  return {
    ...input,
    projection,
    loading,
    stale,
    hasVenue,
    ready,
    priceMissing,
    zeroEarnings,
    venueShortfall,
    blocked: priceMissing || zeroEarnings || venueShortfall,
  };
}
