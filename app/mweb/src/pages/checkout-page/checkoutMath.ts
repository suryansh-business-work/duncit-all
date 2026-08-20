import { round2 } from '@duncit/utils';

/** Duncit Coins are 1:1 with the currency, so the most a buyer can redeem is
 * the whole payable AFTER any coupon — clamped by the balance, by the bill and
 * by the gateway's minimum charge. One shared rule with native and the server
 * (rule 40); re-exported here so the page's existing imports keep working. */
export { maxRedeemableCoins } from '@duncit/utils';

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
