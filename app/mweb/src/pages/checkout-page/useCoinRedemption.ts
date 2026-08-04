import { useEffect } from 'react';
import { maxRedeemableCoins } from './checkoutMath';
import type { CheckoutSession } from './useCheckoutSession';

/** What the gold redeem field renders and what the pay handler bills. */
export interface CoinRedemption {
  balance: number;
  applied: number;
  max: number;
  effectiveTotal: number;
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

  return {
    balance: coinBalance,
    applied,
    max,
    effectiveTotal: Math.max(0, payableAfterCoupon - applied),
    onApply: () => setCoinsApplied(max),
    onRemove: removeCoins,
  };
}
