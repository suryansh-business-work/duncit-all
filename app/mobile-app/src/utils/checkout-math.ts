export interface FinanceSettings {
  platform_fee_pct: number;
  gst_pct: number;
  currency_symbol: string;
}

export interface CheckoutBreakup {
  /** Taxable value: the net-of-GST amount (== total − gst). */
  subtotal: number;
  /** Platform fee — Duncit revenue taken FROM the net (net × f); a memo already
   * inside `subtotal`, never added on top of the total. */
  fee: number;
  gst: number;
  total: number;
  currency: string;
  feePct: number;
  gstPct: number;
}

/** Money rounding to 2dp — the finance engine's single-round rule. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** GST extracted from a GST-inclusive total (total × g/(100+g)) — the finance
 * engine's inclusive extraction, single-round. */
export function inclusiveGst(total: number, gstPct: number): number {
  const g = Number(gstPct) || 0;
  return round2(((Number(total) || 0) * g) / (100 + g));
}

/**
 * Split a gross GST-inclusive total into the finance-engine breakup — RN port of
 * mWeb's buildBreakup. GST is extracted inclusive; the taxable value is the net;
 * the platform fee is a memo taken from net (net × f), never added to the total.
 */
export function buildBreakup(
  amount: number,
  settings: FinanceSettings | null,
): CheckoutBreakup | null {
  if (!settings) return null;
  const gross = Number(amount) || 0;
  const gst = inclusiveGst(gross, settings.gst_pct);
  const subtotal = round2(gross - gst);
  const fee = round2(subtotal * (settings.platform_fee_pct / 100));
  return {
    subtotal,
    fee,
    gst,
    total: round2(gross),
    currency: settings.currency_symbol,
    feePct: settings.platform_fee_pct,
    gstPct: settings.gst_pct,
  };
}

/** "<currency><value.2dp>" money label — mWeb's formatMoney. */
export function formatMoney(currency: string, value: number): string {
  return `${currency}${Number(value).toFixed(2)}`;
}
