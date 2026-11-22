import { paidPodSubmitBlocked, payableSpots, type OfferEarningsArgs } from '@duncit/utils';

import {
  usePotentialEarnings,
  type EarningsVenueArgs,
  type PodEarningsProjection,
  type PotentialEarnings,
} from '@/hooks/usePotentialEarnings';

export interface PodPricingInput {
  /** Gross ticket price per spot (₹, GST-inclusive). */
  podAmount: number;
  /** Total capacity the host entered, including their own free seat. */
  noOfSpots: number;
  venueId: string | null;
  /** What the venue costs the pod, or null while nothing is booked: the
   * offer's quoted total at the pod's spots, or a Pod Request's held slot price. */
  slotPrice: number | null;
  /** A venue offer's money as `potentialPodEarnings` takes it
   * (`offerEarningsArgs`): what the venue is paid (venue price + GST) and
   * Duncit's commission on top, which comes off the host's side, at the pod's
   * spots — and the same at the venue's minimum guests when that is fewer, so
   * the host sees a range — with the offer's model and hours, which pick the
   * venue's minimum business. Absent for a held slot. */
  offerEarnings?: OfferEarningsArgs | null;
  isPhysical: boolean;
  /** A FREE pod is the only pod allowed to carry no ticket price. */
  isFree: boolean;
}

export interface PodPricingState extends PodPricingInput {
  projection: PodEarningsProjection | null;
  waterfall: PotentialEarnings | null;
  isLoading: boolean;
  /** The projection request failed — there is no answer to judge the pod on. */
  failed: boolean;
  /** A physical pod with a slot picked — the venue rows apply. */
  venuePicked: boolean;
  /** Both money inputs are set, so a projection can be shown. */
  ready: boolean;
  /** Capacity is the host's own free seat only — there is nothing to bill. */
  hostOnly: boolean;
  /** A paid pod with no ticket price entered yet — nothing to project. */
  priceMissing: boolean;
  /** The whole pod collects less than the venue's fixed slot price (the venue row's error). */
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
export function isVenueShortfall(input: PodPricingInput): boolean {
  const { podAmount, noOfSpots, slotPrice, isPhysical } = input;
  if (!isPhysical || slotPrice === null || slotPrice <= 0) return false;
  if (podAmount <= 0 || noOfSpots <= 1) return false;
  return totalPodValue(podAmount, noOfSpots) < slotPrice;
}

/** The venue arguments the projection is asked with: an offer's money (at
 * both ends of its guests, with its model and hours), a held slot's price, or
 * none. mWeb twin. */
function venueArgsOf(
  venuePicked: boolean,
  slotPrice: number | null,
  offerEarnings: OfferEarningsArgs | null | undefined,
): EarningsVenueArgs | null {
  if (!venuePicked) return null;
  return offerEarnings ?? { venue_amount: slotPrice, venue_commission_on_top: null };
}

/**
 * The single source of truth for Step 4's money state: the server-computed
 * earnings projection and the server's own verdict on it (`viable`, the create
 * guard's rule at every spot: more than the venue's minimum business after
 * Duncit's commission, the venue covered, and a payout above ₹0). A paid pod
 * can be created only while a projection answered for exactly these inputs —
 * nothing in flight, no failure, the venue's cost known — says viable; a free
 * pod is exempt. The stepper owns this hook so the Create Pod button and the
 * price panel read the SAME numbers. mWeb twin: useEarningsPreview (rule 27).
 */
export function usePodPricing(input: PodPricingInput): PodPricingState {
  const { podAmount, noOfSpots, venueId, slotPrice, offerEarnings, isPhysical, isFree } = input;
  const venuePicked = isPhysical && slotPrice !== null;
  // A free pod has no calculation at all: a ₹0 amount is what makes the
  // earnings hook send nothing, whatever the field still holds.
  const { projection, waterfall, isLoading, failed, retry } = usePotentialEarnings(
    isFree ? 0 : podAmount,
    noOfSpots,
    venuePicked ? venueId : null,
    venueArgsOf(venuePicked, slotPrice, offerEarnings),
  );

  const ready = !isFree && podAmount > 0 && noOfSpots > 0;
  // The field starts blank, so a paid pod has nothing to publish until the host
  // types a price — ₹0 is never assumed on their behalf.
  const priceMissing = !isFree && podAmount <= 0;
  // A physical pod always books a venue: until its cost is known (the offer's
  // quote, the held slot's price) an answer without it is not this pod's.
  const venueKnown = !isPhysical || venuePicked;
  const fresh = ready && noOfSpots > 1 && venueKnown && !isLoading && Boolean(projection);

  return {
    ...input,
    projection,
    waterfall,
    isLoading,
    failed: ready && Boolean(failed),
    venuePicked,
    ready,
    hostOnly: ready && noOfSpots === 1,
    priceMissing,
    venueShortfall: !isFree && isVenueShortfall(input),
    fresh,
    notViable: fresh && projection?.viable === false,
    blocked: paidPodSubmitBlocked(isFree, fresh, projection),
    retry,
  };
}
