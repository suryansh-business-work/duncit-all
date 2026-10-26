/**
 * Number and text formatting for the MCP console, in the reader's locale.
 * Pure — the locale comes from the caller's `useTranslation()`.
 */

/** A whole count with the locale's grouping: 12,345. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value || 0);
}

/**
 * An estimated cost in the currency it was priced in. Token costs are often a
 * fraction of a cent, so a small amount keeps its significant digits instead
 * of rounding to zero. An unknown currency code still reads as a number.
 */
export function formatCost(value: number, currency: string, locale: string): string {
  const amount = value || 0;
  const digits = amount !== 0 && Math.abs(amount) < 1 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 2 };
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, ...digits }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale, digits).format(amount)} ${currency}`;
  }
}

/** A JSON document pretty-printed for reading; text that is not JSON is shown as it is. */
export function prettyJson(text: string | null | undefined): string {
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
