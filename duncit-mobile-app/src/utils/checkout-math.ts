export interface FinanceSettings {
  platform_fee_pct: number;
  gst_pct: number;
  currency_symbol: string;
}

export interface CheckoutBreakup {
  subtotal: number;
  fee: number;
  gst: number;
  total: number;
  currency: string;
  feePct: number;
  gstPct: number;
}

/**
 * Reverse-engineer the fee/GST breakup from a gross total — RN port of mWeb's
 * buildBreakup. The pod amount already includes platform fee + GST, so we divide
 * back out to show the inclusive split.
 */
export function buildBreakup(
  amount: number,
  settings: FinanceSettings | null,
): CheckoutBreakup | null {
  if (!settings) return null;
  const gross = Number(amount) || 0;
  const feeRate = settings.platform_fee_pct / 100;
  const gstRate = settings.gst_pct / 100;
  const divisor = (1 + feeRate) * (1 + gstRate);
  const subtotal = divisor > 0 ? gross / divisor : gross;
  const fee = subtotal * feeRate;
  const gst = (subtotal + fee) * gstRate;
  return {
    subtotal,
    fee,
    gst,
    total: gross,
    currency: settings.currency_symbol,
    feePct: settings.platform_fee_pct,
    gstPct: settings.gst_pct,
  };
}

/** "<currency><value.2dp>" money label — mWeb's formatMoney. */
export function formatMoney(currency: string, value: number): string {
  return `${currency}${Number(value).toFixed(2)}`;
}
