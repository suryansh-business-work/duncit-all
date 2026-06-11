export function buildBreakup(amount: number, settings: any) {
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

export const formatMoney = (currency: string, value: number) => `${currency}${Number(value).toFixed(2)}`;
