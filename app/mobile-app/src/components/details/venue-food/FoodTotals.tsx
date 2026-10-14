import { Text, XStack, YStack } from 'tamagui';
import { formatFoodMoney, type FoodTaxLine } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  subtotal: number;
  discount: number;
  discountPct: number;
  /** The venue's coupon and what it took off — its own line, after the discount. */
  coupon?: { code: string; pct: number; amount: number } | null;
  /** The GST (`foodTaxLine`): a line added before the total, or a note under it when it is inside the prices. */
  tax?: FoodTaxLine | null;
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
 * one is applied, GST added on top (or a note that the prices include it), and
 * the total — the same lines on the cart (where they follow the steppers, so the block is a
 * live region) and on the placed order. Tamagui twin of mWeb's food/FoodTotals.
 */
export function FoodTotals({
  subtotal,
  discount,
  discountPct,
  coupon,
  tax,
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
      {tax?.mode === 'EXCLUSIVE' ? (
        <Row
          label={t('mweb.venueFood.cart.gstAdded', { vars: { pct: String(tax.pct) } })}
          value={`+ ${money(tax.amount)}`}
          testID={`${testID}-gst`}
        />
      ) : null}
      <YStack height={1} backgroundColor="$borderColor" />
      <Row
        label={t('mweb.venueFood.cart.total')}
        value={money(total)}
        strong
        testID={`${testID}-total`}
      />
      {tax?.mode === 'INCLUSIVE' ? (
        <Text testID={`${testID}-gst-included`} fontSize={12} color="$muted" textAlign="right">
          {t('mweb.venueFood.cart.gstIncluded', {
            vars: { amount: money(tax.amount), pct: String(tax.pct) },
          })}
        </Text>
      ) : null}
    </YStack>
  );
}
