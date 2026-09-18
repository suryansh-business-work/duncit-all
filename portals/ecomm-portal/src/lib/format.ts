import { formatMoney } from '@duncit/utils';

/**
 * Money as the store's operators read it — grouped, two decimals, in the
 * order's own currency symbol when the row carries one (the package default
 * otherwise, which is the store's own currency).
 */
export const money = (value: number | null | undefined, symbol?: string): string =>
  formatMoney(value ?? 0, { symbol: symbol || undefined, decimals: 2 });

/** A blank-safe number for a form field that holds text. */
export const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** A whole number for a form field that holds text; `null` when it is blank. */
export const toOptionalInt = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Text for a number the form edits — `''` for an absent one. */
export const numberText = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

/** Non-empty trimmed lines of a multi-line box. */
export const splitLines = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);

/** A count with the store's digit grouping (1,25,000). */
export const formatCount = (value: number): string => formatMoney(value, { symbol: '' });
