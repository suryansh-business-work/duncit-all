/**
 * Money formatting for the Indian locale. Replaces the ad-hoc formatMoney /
 * money / fmt helpers that were re-implemented across partners-app, finance,
 * products and crm — each family's exact output is reproducible via options.
 */

const INR_CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const COMPACT_INR = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Threshold (1 lakh) above which compact notation kicks in. */
const COMPACT_THRESHOLD = 100000;

/**
 * Whole-rupee INR currency string via Intl, e.g. 125000 → "₹1,25,000".
 * Matches the byte-identical partners-app dashboard formatters.
 */
export function formatINR(value: number): string {
  return INR_CURRENCY.format(value || 0);
}

export type FormatMoneyOptions = Readonly<{
  /** Currency symbol prefix. Default '₹'. Pass a server-provided symbol for dynamic currencies. */
  symbol?: string;
  /** Fixed number of fraction digits. Default 0. */
  decimals?: number;
  /** en-IN digit grouping (1,25,000). Default true. `false` reproduces the plain `toFixed` family. */
  grouping?: boolean;
  /** Compact notation (₹1.2L-style) for absolute values ≥ 1 lakh. Default false. */
  compact?: boolean;
}>;

/**
 * Superset money formatter covering every portal variant:
 * - `formatMoney(v)` → "₹1,25,000" (partners-app/products style)
 * - `formatMoney(v, { symbol, decimals: 2, grouping: false })` → "₹1250.00" (finance `money(symbol, v)`)
 * - `formatMoney(v, { compact: true })` → "₹1.2L" above 1 lakh (finance startup dashboard)
 */
export function formatMoney(value: number, options: FormatMoneyOptions = {}): string {
  const { symbol = '₹', decimals = 0, grouping = true, compact = false } = options;
  const n = Number(value || 0);
  if (compact && Math.abs(n) >= COMPACT_THRESHOLD) {
    return `${symbol}${COMPACT_INR.format(n)}`;
  }
  if (!grouping) {
    return `${symbol}${n.toFixed(decimals)}`;
  }
  const grouped = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  return `${symbol}${grouped}`;
}
