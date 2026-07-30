import { payableSpots } from '@duncit/utils';

import {
  usePotentialEarnings,
  type PodEarningsProjection,
  type PotentialEarnings,
} from '@/hooks/usePotentialEarnings';

export interface PodPricingInput {
  /** Gross ticket price per spot (₹, GST-inclusive). */
  podAmount: number;
  /** Total capacity the host entered, including their own free seat. */
  noOfSpots: number;
  venueId: string | null;
  /** Price of the picked venue slot, or null while none is picked. */
  slotPrice: number | null;
  isPhysical: boolean;
  /** A FREE pod is the only pod allowed to carry no ticket price. */
  isFree: boolean;
}

export interface PodPricingState extends PodPricingInput {
  projection: PodEarningsProjection | null;
  waterfall: PotentialEarnings | null;
  isLoading: boolean;
  /** A physical pod with a slot picked — the venue rows apply. */
  venuePicked: boolean;
  /** Both money inputs are set, so a projection can be shown. */
  ready: boolean;
  /** Capacity is the host's own free seat only — there is nothing to bill. */
  hostOnly: boolean;
  /** A paid pod with no ticket price entered yet — nothing to project. */
  priceMissing: boolean;
  /** The server projects a take-home of ₹0 or less at this ticket price. */
  zeroEarnings: boolean;
  /** The whole pod collects less than the venue's fixed slot price. */
  venueShortfall: boolean;
  /** Either guard is tripped — Create Pod must stay disabled. */
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
export function isVenueShortfall(input: PodPricingInput): boolean {
  const { podAmount, noOfSpots, slotPrice, isPhysical } = input;
  if (!isPhysical || slotPrice === null || slotPrice <= 0) return false;
  if (podAmount <= 0 || noOfSpots <= 1) return false;
  return totalPodValue(podAmount, noOfSpots) < slotPrice;
}

/**
 * The single source of truth for Step 4's money state: the server-computed
 * earnings projection plus the two guards that block publishing — a ₹0 (or
 * negative) host payout, and a venue slot the pod cannot afford. The stepper
 * owns this hook so the Create Pod button and the price panel read the SAME
 * numbers; both guards clear themselves as soon as the price is raised.
 */
export function usePodPricing(input: PodPricingInput): PodPricingState {
  const { podAmount, noOfSpots, venueId, slotPrice, isPhysical, isFree } = input;
  const venuePicked = isPhysical && slotPrice !== null;
  const { projection, waterfall, isLoading } = usePotentialEarnings(
    podAmount,
    noOfSpots,
    venuePicked ? venueId : null,
    venuePicked ? slotPrice : null,
  );

  const ready = podAmount > 0 && noOfSpots > 0;
  // The field starts blank, so a paid pod has nothing to publish until the host
  // types a price — ₹0 is never assumed on their behalf.
  const priceMissing = !isFree && podAmount <= 0;
  // Never claim ₹0 earnings from a waterfall that a newer price has superseded.
  const zeroEarnings = ready && !isLoading && waterfall !== null && waterfall.host_receives <= 0;
  const venueShortfall = isVenueShortfall(input);

  return {
    ...input,
    projection,
    waterfall,
    isLoading,
    venuePicked,
    ready,
    hostOnly: ready && noOfSpots === 1,
    priceMissing,
    zeroEarnings,
    venueShortfall,
    blocked: priceMissing || zeroEarnings || venueShortfall,
  };
}
