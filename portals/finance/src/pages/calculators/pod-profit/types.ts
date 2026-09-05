export interface PodProfitInputs {
  /** Ticket price paid per spot, GST-inclusive (₹). */
  pod_amount: number;
  /** Number of spots (pod capacity, INCLUDING the host's own seat). Mirrors
   * Pod.no_of_spots — for physical pods this comes from the venue space's
   * capacity, not a separate entry. The waterfall runs on pod_amount × PAYABLE
   * spots (total − 1, because the host's spot is free) so the venue's fixed slot
   * price is counted once for the whole pod. */
  no_of_spots: number;
  /**
   * How many identical pods this row stands for.
   *
   * A projection multiplier, not part of the waterfall: the engine still
   * computes ONE pod, and `scaled` is that answer times this count. Keeping
   * the two apart is what lets the per-pod breakdown stay readable while the
   * headline figure answers "and if we run ten of these?".
   */
  pod_count: number;
  /** GST % extracted from the GST-inclusive pod amount. */
  gst_percent: number;
  /** Duncit platform fee % charged on the net (post-GST) amount. */
  platform_fee_percent: number;
  /** The venue's fixed booked slot price (₹), set per venue in Partners. */
  venue_amount: number;
  /** Duncit commission % taken from the host's amount (default deduction). */
  host_commission_percent: number;
  /** Duncit commission % taken from the venue's amount (default deduction). */
  venue_commission_percent: number;
  /** Club-admin cut % off the pool (after GST + platform fee, before the
   * venue/host split). Becomes Duncit revenue — mirrors breakdown.math.ts. */
  club_admin_percent: number;
}

/** One pod's figures times `pod_count` — what the headers and totals add up. */
export interface PodProfitScaled {
  pod_count: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
}

export interface PodProfitResults {
  /** Spots entered (capacity, including the host's own free seat). */
  total_spots: number;
  /** Spots actually billed: total − 1, because the host's spot is free. */
  payable_spots: number;
  /** Total collection = ticket price × PAYABLE spots (what the waterfall runs on). */
  collection_total: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_amount: number;
  pool_amount: number;
  /** Club-admin cut off the pool — folded into duncit_revenue_total. */
  club_admin_amount: number;
  /** The venue's fixed slot price, taken whole (never clamped to the pool). */
  venue_amount: number;
  venue_commission_amount: number;
  venue_receives: number;
  /** The host's remainder: pool − venue amount (negative on a shortfall). */
  host_amount: number;
  host_commission_amount: number;
  host_receives: number;
  /** Platform fee + venue commission + host commission. */
  duncit_revenue_total: number;
  /** host_receives / collection_total as a %, 0 when the collection is 0. */
  host_earn_percent: number;
  /** gst + host_receives + venue_receives + duncit — reconciles to collection_total. */
  reconciled_total: number;
  /** The same figures across `pod_count` identical pods. */
  scaled: PodProfitScaled;
}

export const DEFAULT_INPUTS: PodProfitInputs = {
  pod_amount: 1000,
  no_of_spots: 30,
  pod_count: 1,
  gst_percent: 18,
  platform_fee_percent: 5,
  venue_amount: 400,
  host_commission_percent: 10,
  venue_commission_percent: 10,
  club_admin_percent: 0,
};

export const formatRupees = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
