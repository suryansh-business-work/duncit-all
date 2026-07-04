/**
 * Pod finance breakdown — the single money-math engine for every surface that
 * shows a pod's financials (Finance portal, host/venue dashboards, create-pod
 * potential-earnings preview, admin Complete-a-Pod dialog).
 *
 * Indian-GST model (all prices customer-facing GST-INCLUSIVE):
 *   1. GST is extracted from the customer payment:      gst  = P × g/(100+g)
 *   2. Platform fee applies on the net-of-GST amount:    fee  = net × f%
 *   3. The venue's money is its FIXED booked slot price (set by the venue in
 *      the Partners portal), taken from the remaining pool (clamped to the
 *      pool so the host side can never go negative).
 *   4. Whatever remains after the venue's price is the HOST's amount — there
 *      is no host/venue share percentage.
 *   5. Duncit's commission comes out of each side:       hc = host_amount × hc%,
 *      vc = venue_amount × vc%
 *   6. Duncit revenue = platform fee + both commissions. No GST is applied on
 *      Duncit's internal commission lines — GST is collected once, on the
 *      customer payment.
 *
 * GST % / platform fee % / both commission %s are dynamic (admin-managed
 * defaults with per-host / per-venue commission overrides) — resolution
 * happens in the service layer; this module is a pure function of
 * (amount, venue amount, rates).
 *
 * All amounts are PAISE INTEGERS. Rounding is half-up per line, and the lines
 * are reconciled so the invariant always holds exactly:
 *   gst + host_receives + venue_receives + duncit_revenue === amount_paise
 */

export interface BreakdownRates {
  /** GST % applied on the customer payment (inclusive extraction), e.g. 18. */
  gst_percent: number;
  /** Duncit platform fee % on the net-of-GST amount, e.g. 5. */
  platform_fee_percent: number;
  /** Duncit commission % taken from the host's amount, e.g. 10. */
  host_commission_percent: number;
  /** Duncit commission % taken from the venue's amount, e.g. 10. */
  venue_commission_percent: number;
}

export interface PodFinanceBreakdown {
  /** What the customer paid, GST-inclusive (paise). */
  amount_paise: number;
  gst_paise: number;
  net_paise: number;
  platform_fee_paise: number;
  pool_paise: number;
  /** The venue's booked slot price, clamped to the pool (paise). */
  venue_amount_paise: number;
  venue_commission_paise: number;
  venue_receives_paise: number;
  /** The host's remainder: pool − venue amount (paise). */
  host_amount_paise: number;
  host_commission_paise: number;
  host_receives_paise: number;
  /** Platform fee + both commissions. */
  duncit_revenue_paise: number;
  /** host_receives / amount as a % (0 when amount is 0), 2-decimal precision. */
  host_earn_percent: number;
  /** The exact rates used — persisted with settlements so history never drifts. */
  rates: BreakdownRates;
}

const RATE_KEYS: readonly (keyof BreakdownRates)[] = [
  'gst_percent',
  'platform_fee_percent',
  'host_commission_percent',
  'venue_commission_percent',
];

/** Validates a rate set: every key present, finite, within 0–100. Throws on
 * bad input — rates are admin-editable so this guards misconfiguration. */
export function assertValidRates(rates: BreakdownRates): void {
  for (const key of RATE_KEYS) {
    const value = rates[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`Invalid finance rate ${key}: ${value} (must be 0–100)`);
    }
  }
}

/**
 * Computes the full GST-inclusive breakdown for a pod payment.
 * Pure: same inputs → same output. All arithmetic on paise integers with
 * half-up rounding per line and exact reconciliation.
 *
 * @param amountPaise      what customers paid in total (GST-inclusive)
 * @param venueAmountPaise the venue's booked slot price (0 when no venue)
 */
export function computePodFinanceBreakdown(
  amountPaise: number,
  venueAmountPaise: number,
  rates: BreakdownRates
): PodFinanceBreakdown {
  if (!Number.isInteger(amountPaise) || amountPaise < 0) {
    throw new Error(`Invalid amount_paise: ${amountPaise} (must be a non-negative integer)`);
  }
  if (!Number.isInteger(venueAmountPaise) || venueAmountPaise < 0) {
    throw new Error(
      `Invalid venue_amount_paise: ${venueAmountPaise} (must be a non-negative integer)`
    );
  }
  assertValidRates(rates);

  const gst = Math.round((amountPaise * rates.gst_percent) / (100 + rates.gst_percent));
  const net = amountPaise - gst;
  const fee = Math.round((net * rates.platform_fee_percent) / 100);
  const pool = net - fee;
  // The venue's fixed price comes off the pool first; the host owns the rest.
  const venueAmount = Math.min(venueAmountPaise, pool);
  const hostAmount = pool - venueAmount;
  const venueCommission = Math.round((venueAmount * rates.venue_commission_percent) / 100);
  const hostCommission = Math.round((hostAmount * rates.host_commission_percent) / 100);
  const venueReceives = venueAmount - venueCommission;
  const hostReceives = hostAmount - hostCommission;
  const duncitRevenue = fee + hostCommission + venueCommission;

  const hostEarnPercent =
    amountPaise === 0 ? 0 : Math.round((hostReceives / amountPaise) * 10000) / 100;

  return {
    amount_paise: amountPaise,
    gst_paise: gst,
    net_paise: net,
    platform_fee_paise: fee,
    pool_paise: pool,
    venue_amount_paise: venueAmount,
    venue_commission_paise: venueCommission,
    venue_receives_paise: venueReceives,
    host_amount_paise: hostAmount,
    host_commission_paise: hostCommission,
    host_receives_paise: hostReceives,
    duncit_revenue_paise: duncitRevenue,
    host_earn_percent: hostEarnPercent,
    rates: { ...rates },
  };
}
