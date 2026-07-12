export interface PodProfitInputs {
  /** Customer payment for one pod seat, GST-inclusive (₹). */
  pod_amount: number;
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
  /** host_receives / pod_amount as a %, 0 when the amount is 0. */
  host_earn_percent: number;
  /** gst + host_receives + venue_receives + duncit — reconciles to pod_amount. */
  reconciled_total: number;
}

export const DEFAULT_INPUTS: PodProfitInputs = {
  pod_amount: 1000,
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
