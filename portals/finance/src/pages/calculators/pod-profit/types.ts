export interface PodProfitInputs {
  /** Ticket price paid per spot, GST-inclusive (₹). */
  pod_amount: number;
  /** Number of spots (pod capacity). Mirrors Pod.no_of_spots — for physical
   * pods this comes from the venue space's capacity, not a separate entry. The
   * waterfall runs on pod_amount × spots so the venue's fixed slot price is
   * counted once for the whole pod. */
  no_of_spots: number;
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
}

export interface PodProfitResults {
  /** Total collection = ticket price × spots (the amount the waterfall runs on). */
  collection_total: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_amount: number;
  pool_amount: number;
  /** The venue's fixed slot price, clamped to the pool. */
  venue_amount: number;
  venue_commission_amount: number;
  venue_receives: number;
  /** The host's remainder: pool − venue amount. */
  host_amount: number;
  host_commission_amount: number;
  host_receives: number;
  /** Platform fee + venue commission + host commission. */
  duncit_revenue_total: number;
  /** host_receives / collection_total as a %, 0 when the collection is 0. */
  host_earn_percent: number;
  /** gst + host_receives + venue_receives + duncit — reconciles to collection_total. */
  reconciled_total: number;
}

export const DEFAULT_INPUTS: PodProfitInputs = {
  pod_amount: 1000,
  no_of_spots: 30,
  gst_percent: 18,
  platform_fee_percent: 5,
  venue_amount: 400,
  host_commission_percent: 10,
  venue_commission_percent: 10,
};

export const formatRupees = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
