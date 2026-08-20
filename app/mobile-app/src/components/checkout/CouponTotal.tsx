import { Text } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';

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
  const { t } = useTranslation();
  if (effectiveTotal >= originalTotal) return null;
  return (
    <Text testID="coupon-total" fontSize={14} fontWeight="600" color="$color">
      {t('mweb.checkout.youPay', { vars: { amount: formatMoney(currency, effectiveTotal) } })}{' '}
      <Text fontSize={13} color="$muted" textDecorationLine="line-through">
        {formatMoney(currency, originalTotal)}
      </Text>
    </Text>
  );
}
