import { Text, XStack, YStack } from 'tamagui';
import { FOOD_PAYMENT_STATUS_KEYS, formatFoodMoney, type VenueFoodOrder } from '@duncit/utils';

import { DietMark } from '@/components/details/venue-food/DietMark';
import { FoodTotals } from '@/components/details/venue-food/FoodTotals';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

function Detail({
  label,
  value,
  testID,
}: Readonly<{ label: string; value: string; testID: string }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text fontSize={14} color="$muted">
        {label}
      </Text>
      <Text testID={testID} flex={1} fontSize={14} fontWeight="600" color="$color" textAlign="right">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * What was ordered and what it came to — as the server priced it — then who
 * it is for: payment, name, table, note and when it was placed. Tamagui twin
 * of mWeb's venue-food-order-page/FoodOrderSummary.
 */
export function FoodOrderSummary({ order }: Readonly<{ order: VenueFoodOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const money = (amount: number) => formatFoodMoney(amount, order.currency_symbol);

  return (
    <SurfaceCard gap={12} testID="food-order-summary">
      <SectionHeader testID="food-order-items-header" title={t('mweb.venueFood.order.items')} />
      <YStack role="list" gap={8}>
        {order.items.map((line) => (
          <XStack key={line.item_id} role="listitem" alignItems="center" gap={8}>
            <DietMark diet={line.diet} />
            <YStack flex={1}>
              <Text fontSize={14} fontWeight="600" color="$color">
                {line.name}
              </Text>
              <Text fontSize={12} color="$muted">
                {t('mweb.venueFood.cart.qtyPrice', {
                  vars: { qty: String(line.quantity), price: money(line.unit_price) },
                })}
              </Text>
            </YStack>
            <Text fontSize={14} fontWeight="700" color="$color">
              {money(line.line_total)}
            </Text>
          </XStack>
        ))}
      </YStack>
      <FoodTotals
        subtotal={order.subtotal}
        discount={order.discount_amount}
        discountPct={order.discount_pct}
        total={order.total}
        currency={order.currency_symbol}
        testID="food-order-totals"
      />
      <YStack height={1} backgroundColor="$borderColor" />
      <SectionHeader testID="food-order-details-header" title={t('mweb.venueFood.order.details')} />
      <YStack gap={6}>
        <Detail
          label={t('mweb.venueFood.order.paymentStatus')}
          value={t(FOOD_PAYMENT_STATUS_KEYS[order.payment_status])}
          testID="food-order-payment-status"
        />
        <Detail
          label={t('mweb.venueFood.order.name')}
          value={order.customer_name}
          testID="food-order-name"
        />
        {order.table_label ? (
          <Detail
            label={t('mweb.venueFood.order.table')}
            value={order.table_label}
            testID="food-order-table"
          />
        ) : null}
        {order.note ? (
          <Detail label={t('mweb.venueFood.order.note')} value={order.note} testID="food-order-note" />
        ) : null}
        <Detail
          label={t('mweb.venueFood.order.placedAt')}
          value={formatDateTime(order.created_at)}
          testID="food-order-placed-at"
        />
      </YStack>
    </SurfaceCard>
  );
}
