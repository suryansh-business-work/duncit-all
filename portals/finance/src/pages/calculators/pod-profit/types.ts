/**
 * Who pays for an expense out of their own money.
 *
 * An expense is NOT a redistribution of the collection — it is a cost the side
 * that carries it pays from what it was already paid. So the waterfall above it
 * never moves, and `reconciled_total` still adds back to the collection; the
 * expense only decides whose NET is smaller. Defaults to DUNCIT, matching
 * Finance > Pod Expenses, which records Duncit's per-pod spend.
 */
export const EXPENSE_BEARERS = ['DUNCIT', 'HOST', 'VENUE'] as const;
export type ExpenseBearer = (typeof EXPENSE_BEARERS)[number];

/** One cost line against a pod. Amounts are per pod, like `venue_amount`. */
export interface PodExpense {
  /** Stable per-row key, minted by the client so React keys survive a save. */
  expense_key: string;
  label: string;
  /** Cost for ONE pod (₹). The projection multiplies it by `pod_count`. */
  amount: number;
  borne_by: ExpenseBearer;
}

/** Per-side expense totals — the same shape the results and charts both read. */
export type ExpenseTotals = Record<ExpenseBearer, number>;

export const EMPTY_EXPENSE_TOTALS: ExpenseTotals = { DUNCIT: 0, HOST: 0, VENUE: 0 };

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
  /**
   * Costs against ONE pod, each charged to the side that carries it.
   *
   * An array rather than three totals because the reader needs to see WHAT the
   * money went on — a single "host expenses: ₹3,100" answers nothing when the
   * question is which line to cut.
   */
  expenses: PodExpense[];
}

/** One pod's figures times `pod_count` — what the headers and totals add up. */
export interface PodProfitScaled {
  pod_count: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
  /** Every expense line across all the pods, by who carries it. */
  expenses: ExpenseTotals;
  expense_total: number;
  /** What each side keeps once its own expenses are paid. */
  venue_net: number;
  host_net: number;
  duncit_net: number;
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
  /** gst + host_receives + venue_receives + duncit — reconciles to collection_total.
   * Expenses are deliberately NOT in here: they are each side's own cost, not a
   * share of the collection, so the identity has to hold with or without them. */
  reconciled_total: number;
  /** One pod's expense lines added up per side. */
  expenses: ExpenseTotals;
  /** Every expense line on one pod, whoever carries it. */
  expense_total: number;
  /** venue_receives − the venue's own expenses. */
  venue_net: number;
  /** host_receives − the host's own expenses. */
  host_net: number;
  /** duncit_revenue_total − Duncit's own expenses. */
  duncit_net: number;
  /** host_net / collection_total as a %, 0 when the collection is 0. */
  host_net_percent: number;
  /** The same figures across `pod_count` identical pods. */
  scaled: PodProfitScaled;
}

/**
 * What a calculation starts on when Finance > Default Deductions cannot be
 * read. Every rate here mirrors the server's shipped default, and
 * `useCalculatorDefaults` overwrites all of them with the configured figures
 * on every normal render — this is the offline shape, not the source of truth.
 */
export const DEFAULT_INPUTS: PodProfitInputs = {
  pod_amount: 1000,
  no_of_spots: 30,
  pod_count: 1,
  gst_percent: 18,
  platform_fee_percent: 5,
  venue_amount: 400,
  host_commission_percent: 10,
  venue_commission_percent: 10,
  club_admin_percent: 3,
  // Shared by every pod that starts from the defaults, so it must only ever be
  // REPLACED (`[...expenses, next]`), never pushed into. Every edit path below
  // builds a new array, which is what keeps that safe.
  expenses: [],
};

/** A fresh expense row, charged to Duncit until the reader says otherwise. */
export const newExpense = (): PodExpense => ({
  expense_key: globalThis.crypto.randomUUID(),
  label: '',
  amount: 0,
  borne_by: 'DUNCIT',
});

export const formatRupees = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
