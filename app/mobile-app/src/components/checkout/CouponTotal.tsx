import { Text } from 'tamagui';

import type { CouponPreview } from '@/hooks/checkoutRequests';

/** Strikethrough "You pay …" line shown once a coupon is applied. Shared by the
 * pod and product checkouts. */
export function CouponTotal({
  coupon,
  currency,
  effectiveTotal,
  originalTotal,
}: Readonly<{
  coupon: CouponPreview | null;
  currency: string;
  effectiveTotal: number;
  originalTotal: number;
}>) {
  if (!coupon?.ok) return null;
  return (
    <Text testID="coupon-total" fontSize={14} fontWeight="800" color="$color">
      You pay {currency}
      {effectiveTotal}{' '}
      <Text fontSize={13} color="$muted" textDecorationLine="line-through">
        {currency}
        {originalTotal}
      </Text>
    </Text>
  );
}
