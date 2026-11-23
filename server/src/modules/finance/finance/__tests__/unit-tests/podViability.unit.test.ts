import type { BreakdownRates } from '../../breakdown.math';
import {
  evaluatePodViability,
  minBusinessCheck,
  minimumViableTicketPrice,
  waterfallAt,
  MAX_SEARCH_TICKET_PRICE,
  type VenueCost,
} from '../../podViability';

/**
 * The platform's default rates: GST 18% (inside the ticket price), platform fee
 * 5%, club admin 3%, host commission 10%, Duncit's venue commission 10%.
 */
const RATES: BreakdownRates = {
  gst_percent: 18,
  platform_fee_percent: 5,
  club_admin_percent: 3,
  host_commission_percent: 10,
  venue_commission_percent: 10,
};
const NO_VENUE: VenueCost = { amount: 0, commissionOnTop: null };

/**
 * The reference pod from the production regression ("Test pod", 21 Nov 2026):
 * ₹9 tickets, 5 spots with the host's seat free, a per-guest venue at ₹40 with
 * Duncit's ₹4 commission on top.
 */
const REFERENCE_VENUE: VenueCost = { amount: 40, commissionOnTop: 4 };

describe('waterfallAt — the one waterfall at full capacity', () => {
  it('reproduces the reference pod: ₹36 collected leaves the host at −₹15.89', () => {
    const { paying, revenue, waterfall } = waterfallAt(9, 5, REFERENCE_VENUE, RATES);
    expect({ paying, revenue }).toEqual({ paying: 4, revenue: 36 });
    expect(waterfall).toMatchObject({
      gst_amount: 5.49,
      platform_fee_amount: 1.53,
      club_admin_amount: 0.87,
      venue_amount: 40,
      venue_commission_amount: 4,
      host_receives: -15.89,
    });
  });

  it('shows the ₹4 commission is what separates −₹15.89 from the −₹11.89 an Admin was shown', () => {
    const { waterfall } = waterfallAt(9, 5, { amount: 40, commissionOnTop: null }, { ...RATES, venue_commission_percent: 0 });
    expect(waterfall.host_receives).toBe(-11.89);
  });

  it('bills every seat but the host’s, and nothing for a host-only or empty pod', () => {
    expect(waterfallAt(100, 1, NO_VENUE, RATES).revenue).toBe(0);
    expect(waterfallAt(100, 0, NO_VENUE, RATES).paying).toBe(0);
  });
});

describe('minBusinessCheck — ticket money less Duncit’s commission must be MORE than the venue’s minimum', () => {
  it('refuses ₹100 × 10 against a ₹1000 minimum: 1000 − 10% = 900', () => {
    expect(minBusinessCheck(1000, 1000, 10)).toEqual({
      minimum: 1000,
      ticket_money: 1000,
      commission: 100,
      net: 900,
      passes: false,
    });
  });

  it('refuses a net exactly equal to the minimum — it must be more', () => {
    expect(minBusinessCheck(1000, 900, 10)?.passes).toBe(false);
    expect(minBusinessCheck(1000.01, 900, 10)?.passes).toBe(true);
  });

  it('passes ₹1200 of ticket money against ₹1000: 1200 − 120 = 1080', () => {
    expect(minBusinessCheck(1200, 1000, 10)).toMatchObject({ net: 1080, passes: true });
  });

  it('has nothing to check when the venue set no minimum', () => {
    expect(minBusinessCheck(500, 0, 10)).toBeNull();
    expect(minBusinessCheck(500, null, 10)).toBeNull();
  });
});

describe('evaluatePodViability — the create/edit guard’s verdict', () => {
  // ₹1000 minimum business, ₹100 tickets, no other venue cost.
  const atMinimumBusiness = (spots: number, price = 100) =>
    evaluatePodViability({ podAmount: price, noOfSpots: spots, rates: RATES, venue: NO_VENUE, minBusiness: 1000 });

  it('refuses 9 and 10 spots at ₹100 against a ₹1000 minimum business', () => {
    expect(atMinimumBusiness(9)).toMatchObject({ viable: false, reason: 'BELOW_MIN_BUSINESS' });
    // 10 spots = 9 paying seats: 900 − 90 = 810.
    expect(atMinimumBusiness(10).min_business).toMatchObject({ ticket_money: 900, net: 810, passes: false });
  });

  it('needs 13 spots at ₹100 (12 paying seats + the host’s free seat): 1200 − 120 = 1080', () => {
    expect(atMinimumBusiness(12)).toMatchObject({ viable: false, reason: 'BELOW_MIN_BUSINESS' });
    expect(atMinimumBusiness(13)).toMatchObject({ viable: true, reason: null });
  });

  it('names the lowest ticket price that clears the minimum business for the spots chosen', () => {
    // 9 paying seats: price × 9 × 0.9 must be more than 1000 → ₹124 (124 × 9 = 1116 − 111.6 = 1004.4).
    const verdict = atMinimumBusiness(10);
    expect(verdict.minimum_viable_ticket_price).toBe(124);
    expect(atMinimumBusiness(10, 123).viable).toBe(false);
    expect(atMinimumBusiness(10, 124).viable).toBe(true);
  });

  it('refuses the reference pod because ₹36 does not even cover the ₹40 venue, and names ₹15', () => {
    const verdict = evaluatePodViability({ podAmount: 9, noOfSpots: 5, rates: RATES, venue: REFERENCE_VENUE });
    expect(verdict).toMatchObject({ viable: false, reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 15 });
  });

  it('refuses ₹14 (covers the venue, host still −₹0.26) and accepts ₹15 (+₹2.57)', () => {
    const at14 = evaluatePodViability({ podAmount: 14, noOfSpots: 5, rates: RATES, venue: REFERENCE_VENUE });
    const at15 = evaluatePodViability({ podAmount: 15, noOfSpots: 5, rates: RATES, venue: REFERENCE_VENUE });
    expect(at14.waterfall.host_receives).toBe(-0.26);
    expect(at14).toMatchObject({ viable: false, reason: 'NO_EARNINGS' });
    expect(at15.waterfall.host_receives).toBe(2.57);
    expect(at15).toMatchObject({ viable: true, reason: null });
  });

  it('reports the minimum business first when both rules fail, and prices the fix for both', () => {
    const verdict = evaluatePodViability({ podAmount: 9, noOfSpots: 5, rates: RATES, venue: REFERENCE_VENUE, minBusiness: 100 });
    expect(verdict.reason).toBe('BELOW_MIN_BUSINESS');
    // Profit alone needs ₹15; the ₹100 minimum needs 4 × p × 0.9 > 100 → ₹28.
    expect(verdict.minimum_viable_ticket_price).toBe(28);
  });

  it('refuses exactly ₹0 host earnings — zero is not a profit', () => {
    const verdict = evaluatePodViability({
      podAmount: 500,
      noOfSpots: 4,
      rates: { ...RATES, host_commission_percent: 100 },
      venue: NO_VENUE,
    });
    expect(verdict.waterfall.host_receives).toBe(0);
    expect(verdict).toMatchObject({ viable: false, reason: 'NO_EARNINGS', minimum_viable_ticket_price: null });
  });

  it('applies the venue commission rate it is given (a venue’s own override)', () => {
    const at5 = evaluatePodViability({ podAmount: 100, noOfSpots: 12, rates: { ...RATES, venue_commission_percent: 5 }, venue: NO_VENUE, minBusiness: 1000 });
    // 11 paying seats: 1100 − 55 = 1045 > 1000 at 5%, but 1100 − 110 = 990 at 10%.
    expect(at5.min_business).toMatchObject({ net: 1045, passes: true });
    expect(atMinimumBusiness(12).min_business).toMatchObject({ net: 990, passes: false });
  });
});

describe('minimumViableTicketPrice — the lowest whole-rupee price that passes every rule', () => {
  it('is far above venue ÷ heads, because GST, the fee, the club admin and both commissions come off first', () => {
    const naive = Math.ceil(REFERENCE_VENUE.amount / 4);
    expect(naive).toBe(10);
    expect(waterfallAt(naive, 5, REFERENCE_VENUE, RATES).waterfall.host_receives).toBeLessThan(0);
    expect(minimumViableTicketPrice({ noOfSpots: 5, rates: RATES, venue: REFERENCE_VENUE })).toBe(15);
  });

  it('is ₹1 with no venue, and null when nobody pays or no price up to the cap can work', () => {
    expect(minimumViableTicketPrice({ noOfSpots: 3, rates: RATES, venue: NO_VENUE })).toBe(1);
    expect(minimumViableTicketPrice({ noOfSpots: 1, rates: RATES, venue: NO_VENUE })).toBeNull();
    expect(minimumViableTicketPrice({ noOfSpots: 2, rates: RATES, venue: { amount: 10_000_000, commissionOnTop: null } })).toBeNull();
  });

  it('matches a linear scan over every price, so the binary search is never wrong', () => {
    const venue: VenueCost = { amount: 1234.56, commissionOnTop: 123.46 };
    const input = { noOfSpots: 7, rates: RATES, venue, minBusiness: 1500 };
    const found = minimumViableTicketPrice(input);
    let scanned = 1;
    while (!evaluatePodViability({ ...input, podAmount: scanned }).viable) scanned += 1;
    expect(found).toBe(scanned);
    expect(found).toBeLessThan(MAX_SEARCH_TICKET_PRICE);
  });
});
