import { Text } from 'tamagui';

/** Strikethrough "You pay …" line shown once the bill is discounted — by a
 * coupon, by redeemed Duncit Coins, or by both. Keyed off the amounts rather
 * than the coupon so coins alone still show what is actually charged (mWeb's
 * `discounted` line). Shared by the pod and product checkouts. */
export function CouponTotal({
  currency,
  effectiveTotal,
  originalTotal,
}: Readonly<{
  currency: string;
  effectiveTotal: number;
  originalTotal: number;
}>) {
  if (effectiveTotal >= originalTotal) return null;
  return (
    <Text testID="coupon-total" fontSize={14} fontWeight="600" color="$color">
      You pay {currency}
      {effectiveTotal}{' '}
      <Text fontSize={13} color="$muted" textDecorationLine="line-through">
        {currency}
        {originalTotal}
      </Text>
    </Text>
  );
}
