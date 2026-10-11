import { useEffect } from 'react';
import { maxRedeemableCoins, settleBill } from '@duncit/utils';
import type { CheckoutSession } from './useCheckoutSession';

/** What the gold redeem field renders and what the pay handler bills. */
export interface CoinRedemption {
  balance: number;
  applied: number;
  max: number;
  /** What is charged: the bill rounded UP to the whole rupee, less the coins. */
  effectiveTotal: number;
  /** The round-off inside `effectiveTotal` (0 when the bill was already whole). */
  roundOff: number;
  /** The value GST is worked out on — `effectiveTotal` without the round-off. */
  taxable: number;
  onApply: () => void;
  onRemove: () => void;
}

/**
 * Turns the session's raw coin state into the redemption a bill can actually
 * take. The payable moves under the buyer — a coupon lands, a coupon is
 * dropped, delivery re-quotes — so the applied amount is re-clamped to the new
 * ceiling instead of being left stale and over-spending the bill.
 *
 * `payableAfterCoupon` is passed in rather than derived because each checkout
 * discounts differently: the pod bill is discounted whole, while the product
 * bill discounts the products subtotal and adds delivery on top.
 */
export function useCoinRedemption(session: CheckoutSession, payableAfterCoupon: number): CoinRedemption {
  const { coinBalance, coinsApplied, setCoinsApplied, removeCoins } = session;
  const max = maxRedeemableCoins(coinBalance, payableAfterCoupon);

  useEffect(() => {
    if (coinsApplied > max) setCoinsApplied(max);
  }, [coinsApplied, max, setCoinsApplied]);

  // Clamp on read too, so the render before the effect settles never shows a
  // redemption larger than the bill.
  const applied = Math.min(coinsApplied, max);
  // The server's own settlement, mirrored once in @duncit/utils: the bill is
  // rounded up to the whole rupee, then the coins come off it — so what is
  // previewed here is a whole number and is exactly what gets charged.
  const bill = settleBill(payableAfterCoupon, applied);

  return {
    balance: coinBalance,
    applied,
    max,
    effectiveTotal: bill.payable,
    roundOff: bill.roundOff,
    taxable: bill.taxable,
    onApply: () => setCoinsApplied(max),
    onRemove: removeCoins,
  };
}
