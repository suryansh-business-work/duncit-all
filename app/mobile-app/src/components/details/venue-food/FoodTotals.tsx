import { Text, XStack, YStack } from 'tamagui';
import { formatFoodMoney } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  subtotal: number;
  discount: number;
  discountPct: number;
  /** The venue's coupon and what it took off — its own line, after the discount. */
  coupon?: { code: string; pct: number; amount: number } | null;
  total: number;
  currency: string;
  testID: string;
}

function Row({
  label,
  value,
  strong,
  testID,
}: Readonly<{ label: string; value: string; strong?: boolean; testID: string }>) {
  return (
    <XStack justifyContent="space-between" gap={8}>
      <Text fontSize={14} fontWeight={strong ? '700' : '400'} color={strong ? '$color' : '$muted'}>
        {label}
      </Text>
      <Text
        testID={testID}
        fontSize={14}
        fontWeight={strong ? '700' : '600'}
        color="$color"
        textAlign="right"
      >
        {value}
      </Text>
    </XStack>
  );
}

/**
 * Subtotal, the QR-order discount when there is one, the venue's coupon when
 * one is applied, and the total — the same lines on the cart (where they follow the steppers, so the block is a
 * live region) and on the placed order. Tamagui twin of mWeb's food/FoodTotals.
 */
export function FoodTotals({
  subtotal,
  discount,
  discountPct,
  coupon,
  total,
  currency,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatFoodMoney(amount, currency);
  return (
    <YStack gap={6} aria-live="polite" testID={testID}>
      <Row
        label={t('mweb.venueFood.cart.subtotal')}
        value={money(subtotal)}
        testID={`${testID}-subtotal`}
      />
      {discount > 0 ? (
        <Row
          label={t('mweb.venueFood.cart.discount', { vars: { pct: String(discountPct) } })}
          value={`− ${money(discount)}`}
          testID={`${testID}-discount`}
        />
      ) : null}
      {coupon ? (
        <Row
          label={t('mweb.venueFood.cart.couponLine', {
            vars: { code: coupon.code, pct: String(coupon.pct) },
          })}
          value={`− ${money(coupon.amount)}`}
          testID={`${testID}-coupon`}
        />
      ) : null}
      <YStack height={1} backgroundColor="$borderColor" />
      <Row
        label={t('mweb.venueFood.cart.total')}
        value={money(total)}
        strong
        testID={`${testID}-total`}
      />
    </YStack>
  );
}
