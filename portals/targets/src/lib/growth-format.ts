import { formatCount, formatMoney } from '@duncit/utils';

/**
 * Display formatting for the Growth Calculator. Money arrives as the server's
 * exact two-decimal rupee string; the paise are shown only when there are any,
 * so ₹3,20,000 stays clean while ₹0.50 is never rounded to ₹1.
 */
export function formatRupees(value: string): string {
  const amount = Number(value);
  return formatMoney(amount, { decimals: Number.isInteger(amount) ? 0 : 2 });
}

/** Lakh / crore shorthand for a headline figure: ₹1.6Cr, ₹3.2L. Below a lakh it is the full amount. */
export function formatRupeesShort(value: string): string {
  const amount = Number(value);
  if (Math.abs(amount) < 100_000) return formatRupees(value);
  return formatMoney(amount, { compact: true });
}

/** A whole-number target with en-IN grouping: 20000 → "20,000". */
export const formatTarget = (value: number): string => formatCount(value);

const INPUT_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** An assumption as typed, with grouping and up to two decimals: 0.01, 1,00,000. */
export const formatInput = (value: number): string => INPUT_FORMAT.format(value);
