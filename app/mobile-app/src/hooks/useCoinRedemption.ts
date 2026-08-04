import { useEffect, useState } from 'react';

import { useCoinBalance } from '@/hooks/useCoins';
import { maxRedeemableCoins } from '@/utils/checkout-math';

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
 * Turns the live coin balance into the redemption a bill can actually take —
 * RN twin of mWeb's useCoinRedemption. The payable moves under the buyer (a
 * coupon lands, a coupon is dropped, delivery re-quotes), so the applied amount
 * is re-clamped to the new ceiling instead of being left stale and over-spending
 * the bill.
 *
 * `payableAfterCoupon` is passed in rather than derived because each checkout
 * discounts differently: the pod bill is discounted whole, while the product
 * bill discounts the products subtotal and adds delivery on top.
 */
export function useCoinRedemption(payableAfterCoupon: number): CoinRedemption {
  const { balance } = useCoinBalance();
  const [coinsApplied, setCoinsApplied] = useState(0);
  const coinBalance = balance?.balance ?? 0;
  const max = maxRedeemableCoins(coinBalance, payableAfterCoupon);

  useEffect(() => {
    if (coinsApplied > max) setCoinsApplied(max);
  }, [coinsApplied, max]);

  // Clamp on read too, so the render before the effect settles never shows a
  // redemption larger than the bill.
  const applied = Math.min(coinsApplied, max);

  return {
    balance: coinBalance,
    applied,
    max,
    effectiveTotal: Math.max(0, payableAfterCoupon - applied),
    onApply: () => setCoinsApplied(max),
    onRemove: () => setCoinsApplied(0),
  };
}
