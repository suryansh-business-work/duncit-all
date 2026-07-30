/**
 * Pod finance breakdown — the single money-math engine for every surface that
 * shows a pod's financials (Finance portal, host/venue dashboards, create-pod
 * potential-earnings preview, admin Complete-a-Pod dialog).
 *
 * Indian-GST model (all prices customer-facing GST-INCLUSIVE):
 *   1. GST is extracted from the customer payment:      gst  = P × g/(100+g)
 *   2. Platform fee applies on the net-of-GST amount:    fee  = net × f%
 *   2b. The club-admin cut comes off the pool (net − fee): ca = pool × ca%
 *       (0–10%); it counts as Duncit revenue, disbursed to the club admin later.
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
  /** Club-admin cut % taken off the pool (after GST + platform fee, before the
   * venue/host split), 0–10. Counts as Duncit revenue (disbursed to the club
   * admin later). */
  club_admin_percent: number;
}

/** Behaviour switches for `computePodFinanceBreakdown`. */
export interface BreakdownOptions {
  /**
   * Default `true` (SETTLEMENT behaviour): the venue amount is clamped to the
   * pool so the host side never goes negative — legacy shortfall pods keep
   * settling exactly as before. Pass `false` for the create-pod PREVIEW: the
   * venue keeps its full fixed price and host_amount / host_receives go
   * negative honestly so clients can render the real shortfall.
   */
  clampVenueToPool?: boolean;
}

export interface PodFinanceBreakdown {
  /** What the customer paid, GST-inclusive (paise). */
  amount_paise: number;
  gst_paise: number;
  net_paise: number;
  platform_fee_paise: number;
  pool_paise: number;
  /** Club-admin cut taken off the pool after GST + platform fee (paise). */
  club_admin_paise: number;
  /** The venue's booked slot price — clamped to the pool by default
   * (settlement), or its full fixed price when `clampVenueToPool` is false
   * (create-pod preview). */
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
  'club_admin_percent',
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
 * Spots that can actually be SOLD for a pod. The host takes one seat for free
 * (they are added to pod_attendees on create and never pay), so a 30-spot pod
 * only ever bills 29 guests. `no_of_spots = 0` means unlimited/unset — there is
 * nothing to project, so it bills 0.
 *
 * Every earnings projection MUST bill this, never the raw spot count.
 */
export function payableSpots(totalSpots: number): number {
  if (!Number.isFinite(totalSpots) || totalSpots <= 0) return 0;
  return Math.floor(totalSpots) - 1;
}

/**
 * Attendees who actually PAID: everyone on the pod minus its host(s).
 *
 * `payableSpots` projects from capacity BEFORE the pod runs; this counts who
 * really turned up, which is what a completed pod settles on. Hosts are written
 * into `pod_attendees` when the pod is created and never pay, so counting the
 * raw list would over-state the head count by one per host.
 *
 * Mirrors `payingAttendees` in @duncit/utils — the server imports no @duncit/*
 * package by design, so the rule is stated in both places.
 */
export function payingAttendees(
  attendeeIds: readonly unknown[] | null | undefined,
  hostIds: readonly unknown[] | null | undefined
): number {
  const attendees = attendeeIds ?? [];
  if (attendees.length === 0) return 0;
  const hosts = new Set((hostIds ?? []).map((id) => String(id)));
  return attendees.filter((id) => !hosts.has(String(id))).length;
}

/**
 * Computes the full GST-inclusive breakdown for a pod payment.
 * Pure: same inputs → same output. All arithmetic on paise integers with
 * half-up rounding per line and exact reconciliation.
 *
 * @param amountPaise      what customers paid in total (GST-inclusive)
 * @param venueAmountPaise the venue's booked slot price (0 when no venue)
 * @param options          clampVenueToPool defaults to true (settlement); the
 *                         create-pod preview passes false so a venue-price
 *                         shortfall surfaces as negative host earnings.
 */
export function computePodFinanceBreakdown(
  amountPaise: number,
  venueAmountPaise: number,
  rates: BreakdownRates,
  options?: BreakdownOptions
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
  // The club-admin cut comes off the pool right after GST + platform fee (before
  // the venue/host split); it becomes Duncit revenue (disbursed to the club admin
  // later). Clamped to the pool so nothing downstream can go negative.
  const clubAdmin = Math.min(pool, Math.round((pool * rates.club_admin_percent) / 100));
  const splitPool = pool - clubAdmin;
  // The venue's fixed price comes off what remains; the host owns the rest.
  // Settlement (default) clamps it to the pool; the preview keeps the full
  // price so hostAmount goes negative honestly on a shortfall.
  const clampVenueToPool = options?.clampVenueToPool ?? true;
  const venueAmount = clampVenueToPool ? Math.min(venueAmountPaise, splitPool) : venueAmountPaise;
  const hostAmount = splitPool - venueAmount;
  const venueCommission = Math.round((venueAmount * rates.venue_commission_percent) / 100);
  // No commission is charged on a non-positive host side — the shortfall passes
  // through whole (and the reconciliation invariant still holds exactly).
  const hostCommission =
    hostAmount > 0 ? Math.round((hostAmount * rates.host_commission_percent) / 100) : 0;
  const venueReceives = venueAmount - venueCommission;
  const hostReceives = hostAmount - hostCommission;
  const duncitRevenue = fee + hostCommission + venueCommission + clubAdmin;

  const hostEarnPercent =
    amountPaise === 0 ? 0 : Math.round((hostReceives / amountPaise) * 10000) / 100;

  return {
    amount_paise: amountPaise,
    gst_paise: gst,
    net_paise: net,
    platform_fee_paise: fee,
    pool_paise: pool,
    club_admin_paise: clubAdmin,
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
