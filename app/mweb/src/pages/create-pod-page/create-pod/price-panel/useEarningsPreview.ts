import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { paidPodSubmitBlocked, payableSpots, type OfferEarningsArgs } from '@duncit/utils';
import { POTENTIAL_POD_EARNINGS, type EarningsProjection } from './queries';

export interface EarningsPreviewInput {
  /** What the venue costs the pod (null when nothing is booked): the offer's
   * quoted total at the pod's spots, or a Pod Request's held slot price. */
  slotPrice: number | null;
  /** A venue offer's money as `potentialPodEarnings` takes it
   * (`offerEarningsArgs`): what the venue is paid (venue price + GST) and
   * Duncit's commission on top, which comes off the host's side, at the pod's
   * spots — and the same at the venue's minimum guests when that is fewer, so
   * the host sees a range — with the offer's model and hours, which pick the
   * venue's minimum business. Absent for a held slot. */
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
  /** The projection request failed — there is no answer to judge the pod on. */
  failed: boolean;
  /** A physical pod with a slot picked — the venue rows apply. */
  hasVenue: boolean;
  /** Both money inputs are set, so a projection can be shown. */
  ready: boolean;
  /** A paid pod with no ticket price entered yet — nothing to project. */
  priceMissing: boolean;
  /** The pod does not even cover the venue's slot price (the venue row's error). */
  venueShortfall: boolean;
  /** The projection answers exactly the inputs on screen, the venue's cost included. */
  fresh: boolean;
  /** That fresh projection says the server would refuse the pod; `projection.viability_reason` says why. */
  notViable: boolean;
  /** Create Pod stays disabled: a paid pod without a fresh projection that says viable. */
  blocked: boolean;
  /** Asks the server again after a failed projection. */
  retry: () => void;
}

/** Ticket price × the spots that can actually be sold (the host sits free). */
export function totalPodValue(podAmount: number, noOfSpots: number): number {
  return podAmount * payableSpots(noOfSpots);
}

/**
 * The venue's slot price is deducted once from the whole collection, so a pod
 * whose entire value is below it can never pay the venue. Computed locally (no
 * server round-trip) for the venue row's error; whether Create Pod is enabled
 * is the server's verdict alone.
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
 * both ends of its guests, with its model and hours), a held slot's price, or none. */
function venueArgsOf(hasVenue: boolean, slotPrice: number | null, offerEarnings: OfferEarningsArgs | null | undefined) {
  if (!hasVenue) return { venue_amount: null, venue_commission_on_top: null };
  return offerEarnings ?? { venue_amount: slotPrice, venue_commission_on_top: null };
}

/**
 * The single source of truth for Step 4's money: the server-owned earnings
 * waterfall and the server's own verdict on it (`viable`, the create guard's
 * rule at every spot: more than the venue's minimum business after Duncit's
 * commission, the venue covered, and a payout above ₹0). A paid pod can be
 * created only while a projection answered for exactly these inputs — the
 * debounce caught up, nothing in flight, no error, the venue's cost known —
 * says viable; a free pod (ticket ₹0) is exempt. The take-home at the venue's
 * minimum guests (`projection.minimum`) is shown as the low end of a range,
 * never a block. mWeb + native apply the identical rule (rule 27).
 */
export function useEarningsPreview(input: Readonly<EarningsPreviewInput>): EarningsPreview {
  const { slotPrice, offerEarnings, podAmount, noOfSpots, venueId, isPhysical, isFree } = input;
  const sent = useDebouncedInputs(podAmount, noOfSpots);
  const hasVenue = isPhysical && slotPrice !== null;
  const { data, loading, error, refetch } = useQuery<{ potentialPodEarnings: EarningsProjection }>(POTENTIAL_POD_EARNINGS, {
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
  const settled = ready && noOfSpots > 1 && !stale && !loading;
  // A physical pod always books a venue: until its cost is known (the offer's
  // quote, the held slot's price) an answer without it is not this pod's.
  const venueKnown = !isPhysical || hasVenue;
  const fresh = settled && venueKnown && !error && projection !== undefined;

  return {
    ...input,
    projection,
    loading,
    stale,
    failed: settled && Boolean(error),
    hasVenue,
    ready,
    priceMissing,
    venueShortfall: !isFree && isVenueShortfall(input),
    fresh,
    notViable: fresh && projection?.viable === false,
    blocked: paidPodSubmitBlocked(isFree, fresh, projection),
    retry: () => {
      // A second failure lands in `error` again, which the notice shows.
      refetch().catch(() => undefined);
    },
  };
}
