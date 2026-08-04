const round2 = (n: number) => Math.round(n * 100) / 100;

/** Split a gross GST-inclusive total into the finance-engine breakup: GST is
 * extracted inclusive (gross × g/(100+g)); the taxable value is the net; the
 * platform fee is a memo taken from net (net × f), never added to the total.
 * Mirrors server computeQuote + usePricing + mobile checkout-math. */
export function buildBreakup(amount: number, settings: any) {
  if (!settings) return null;
  const gross = Number(amount) || 0;
  const gst = round2((gross * settings.gst_pct) / (100 + settings.gst_pct));
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

export const formatMoney = (currency: string, value: number) => `${currency}${Number(value).toFixed(2)}`;

/** Duncit Coins are 1:1 with the currency, so the most a buyer can redeem is
 * the whole payable AFTER any coupon, capped by the balance and floored to a
 * whole coin (redeem_coins is an Int). Never negative. The server clamps again,
 * so this only keeps the on-screen preview honest. */
export const maxRedeemableCoins = (balance: number, payableAfterCoupon: number) =>
  Math.max(0, Math.min(Math.floor(Number(balance) || 0), Math.floor(Number(payableAfterCoupon) || 0)));
