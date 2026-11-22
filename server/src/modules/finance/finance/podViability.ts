/**
 * Whether a PAID pod's money works, at full capacity, on two rules.
 *
 * Pure: the caller resolves the rates, what the venue costs and the venue's
 * minimum business; this runs the one waterfall (breakdown.math via
 * waterfallForAmount) and the minimum-business sum.
 *
 * Seats vs people. The pod's host sits in one seat for free (payableSpots), so
 * N spots are N − 1 paying seats, and the ticket money is the price × those.
 *
 * 1. Minimum business (the venue's own floor, Partners > Fees & Minimum Spend):
 *    the ticket money minus Duncit's venue commission must be MORE than the
 *    least one booking must bring the venue. ₹100 × 10 seats against a ₹1000
 *    minimum is refused: 1000 − 10% = 900. Only then are the venue's cost and
 *    Duncit's commission both covered.
 * 2. Profit: after GST, the platform fee, the club admin's cut, the venue's
 *    actual cost and both commissions, the host must earn MORE than ₹0. Zero is
 *    not a profit.
 */
import { payableSpots, type BreakdownRates } from './breakdown.math';
import { waterfallForAmount, type SettlementWaterfall } from './settlement.service';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);

/** The highest ticket price the minimum-price search will try (₹). */
export const MAX_SEARCH_TICKET_PRICE = 99_999;

/** What the venue is paid, in rupees. `commissionOnTop` is Duncit's venue
 * commission charged on the host's side (a frozen booking); null = the legacy
 * rule, where it comes out of the venue's amount. */
export interface VenueCost {
  amount: number;
  commissionOnTop: number | null;
}

export type PodViabilityReason = 'BELOW_MIN_BUSINESS' | 'VENUE_NOT_COVERED' | 'NO_EARNINGS';

/** The minimum-business sum for one ticket price, in rupees. */
export interface MinBusinessCheck {
  /** The least one booking must bring the venue. */
  minimum: number;
  ticket_money: number;
  /** Duncit's venue commission on that ticket money. */
  commission: number;
  /** ticket_money − commission: what must be MORE than `minimum`. */
  net: number;
  passes: boolean;
}

export interface PodViability {
  viable: boolean;
  /** The first rule broken, in the order a host fixes them; null when viable. */
  reason: PodViabilityReason | null;
  paying_seats: number;
  revenue: number;
  waterfall: SettlementWaterfall;
  /** Null when the venue has no minimum business for this booking. */
  min_business: MinBusinessCheck | null;
  /** The fewest whole rupees per ticket that passes both rules; null when no
   * price up to the cap does. */
  minimum_viable_ticket_price: number | null;
}

export interface PodViabilityInput {
  podAmount: number;
  noOfSpots: number;
  rates: BreakdownRates;
  /** What the venue costs with every spot filled. */
  venue: VenueCost;
  /** The least one booking must bring the venue, in rupees; 0 / absent = none. */
  minBusiness?: number | null;
}

/** The waterfall for `spots` at `podAmount` a paying seat. Unclamped — a venue
 * costing more than the pool shows as negative host earnings, exactly as
 * settlement would pay it. */
export function waterfallAt(podAmount: number, spots: number, venue: VenueCost, rates: BreakdownRates) {
  const paying = payableSpots(spots);
  const revenue = round2(Math.max(0, podAmount) * paying);
  const waterfall = waterfallForAmount(revenue, venue.amount, rates, {
    clampVenueToPool: false,
    venueCommissionOnTopPaise: venue.commissionOnTop == null ? null : toPaise(venue.commissionOnTop),
  });
  return { paying, revenue, waterfall };
}

/**
 * The minimum-business sum, in paise so ₹1000.00 against ₹1000.00 is exactly
 * equal (and so refused — the net must be MORE than the minimum). Null when
 * there is no minimum.
 */
export function minBusinessCheck(revenue: number, minimum: number | null | undefined, commissionPct: number): MinBusinessCheck | null {
  const minimumPaise = toPaise(Math.max(0, Number(minimum) || 0));
  if (minimumPaise <= 0) return null;
  const revenuePaise = toPaise(revenue);
  const commissionPaise = Math.round((revenuePaise * Math.max(0, commissionPct)) / 100);
  const netPaise = revenuePaise - commissionPaise;
  return {
    minimum: minimumPaise / 100,
    ticket_money: revenuePaise / 100,
    commission: commissionPaise / 100,
    net: netPaise / 100,
    passes: netPaise > minimumPaise,
  };
}

/** Both rules at one ticket price — the predicate the price search walks. */
function passesAt(price: number, input: PodViabilityInput): boolean {
  const { revenue, waterfall } = waterfallAt(price, input.noOfSpots, input.venue, input.rates);
  const floor = minBusinessCheck(revenue, input.minBusiness, input.rates.venue_commission_percent);
  return (floor === null || floor.passes) && revenue >= input.venue.amount && waterfall.host_receives > 0;
}

/**
 * The fewest whole rupees per ticket that passes both rules — found on the same
 * waterfall, never by dividing the venue's cost by heads (that leaves out GST,
 * the platform fee, the club admin's cut and the commissions).
 *
 * Both rules only get easier as the price rises: even at the 50% GST and 50%
 * platform-fee ceilings and a 10% club-admin cut, one rupee per seat adds about
 * 30 paise to the split pool — far more than the few paise of per-line rounding
 * — the host commission only applies to a positive remainder, and the minimum
 * business net is the ticket money less a fixed percent of it. So a binary
 * search is sound; the answer is re-checked on the full rules.
 */
export function minimumViableTicketPrice(input: Omit<PodViabilityInput, 'podAmount'>): number | null {
  if (payableSpots(input.noOfSpots) <= 0) return null;
  const at = (price: number) => passesAt(price, { ...input, podAmount: price });
  if (!at(MAX_SEARCH_TICKET_PRICE)) return null;
  let lo = 1;
  let hi = MAX_SEARCH_TICKET_PRICE;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (at(mid)) hi = mid;
    else lo = mid + 1;
  }
  return at(lo) ? lo : null;
}

export function evaluatePodViability(input: PodViabilityInput): PodViability {
  const spots = Math.max(0, Math.floor(Number(input.noOfSpots) || 0));
  const normalized = { ...input, noOfSpots: spots, podAmount: Math.max(0, Number(input.podAmount) || 0) };
  const { paying, revenue, waterfall } = waterfallAt(normalized.podAmount, spots, input.venue, input.rates);
  const floor = minBusinessCheck(revenue, input.minBusiness, input.rates.venue_commission_percent);

  let reason: PodViabilityReason | null = null;
  if (floor && !floor.passes) reason = 'BELOW_MIN_BUSINESS';
  else if (revenue < input.venue.amount) reason = 'VENUE_NOT_COVERED';
  else if (waterfall.host_receives <= 0) reason = 'NO_EARNINGS';

  return {
    viable: reason === null,
    reason,
    paying_seats: paying,
    revenue,
    waterfall,
    min_business: floor,
    minimum_viable_ticket_price: minimumViableTicketPrice(normalized),
  };
}
