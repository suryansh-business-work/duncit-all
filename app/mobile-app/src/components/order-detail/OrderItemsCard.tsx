import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { OrderPaymentMethod } from '@/generated/graphql/graphql';
import type { OrderDetail } from '@/hooks/useOrderDetail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

function Row({
  label,
  value,
  strong,
  testID,
}: Readonly<{ label: string; value: string; strong?: boolean; testID: string }>) {
  return (
    <XStack justifyContent="space-between" gap={8}>
      <Text fontSize={13} fontWeight={strong ? '700' : '400'} color={strong ? '$color' : '$muted'}>
        {label}
      </Text>
      <Text
        fontSize={13}
        fontWeight={strong ? '700' : '600'}
        color="$color"
        testID={testID}
        flexShrink={1}
        textAlign="right"
      >
        {value}
      </Text>
    </XStack>
  );
}

/**
 * What was bought and what it cost: each line with its picture, quantity and
 * price, then the bill — items, delivery, any discount or coins, the total,
 * and how it was paid. RN twin of mWeb's order-detail-page/OrderItemsCard.
 */
export function OrderItemsCard({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const cod = order.payment_method === OrderPaymentMethod.Cod;

  return (
    <YStack gap={10} testID="order-items">
      <Text role="heading" fontSize={14} fontWeight="700" color="$color">
        {t('mweb.orderDetail.items')}
      </Text>
      {order.line_items.map((line) => (
        <XStack
          key={`${line.product_id}-${line.variant_id || 'base'}`}
          gap={10}
          alignItems="center"
        >
          {line.image_url ? (
            <AppImage
              source={{ uri: line.image_url }}
              style={{ width: 48, height: 48, borderRadius: 8 }}
            />
          ) : (
            <YStack
              width={48}
              height={48}
              borderRadius={8}
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
            >
              <MaterialIcons name="shopping-bag" size={20} color={muted} />
            </YStack>
          )}
          <YStack flex={1}>
            <Text fontSize={13} fontWeight="600" color="$color">
              {line.name}
              {line.variant_label ? ` — ${line.variant_label}` : ''}
            </Text>
            <Text fontSize={11.5} color="$muted">
              {t('mweb.orderDetail.qtyPrice', {
                vars: { qty: String(line.qty), price: money(line.unit_cost) },
              })}
            </Text>
          </YStack>
          <Text fontSize={13} fontWeight="700" color="$color">
            {money(line.gross)}
          </Text>
        </XStack>
      ))}
      <YStack height={1} backgroundColor="$borderColor" />
      <YStack gap={6} testID="order-price">
        <Text role="heading" fontSize={14} fontWeight="700" color="$color">
          {t('mweb.orderDetail.priceDetails')}
        </Text>
        <Row
          label={t('mweb.orderDetail.itemsTotal')}
          value={money(order.items_total)}
          testID="order-items-total"
        />
        {order.fulfilment_method === 'SHIP' ? (
          <Row
            label={t('mweb.orderDetail.deliveryCharge')}
            value={money(order.shipping_charge)}
            testID="order-delivery-charge"
          />
        ) : null}
        {order.discount_total > 0 ? (
          <Row
            label={t('mweb.orderDetail.discount')}
            value={`− ${money(order.discount_total)}`}
            testID="order-discount"
          />
        ) : null}
        {order.coins_share > 0 ? (
          <Row
            label={t('mweb.orderDetail.coinsUsed')}
            value={String(order.coins_share)}
            testID="order-coins"
          />
        ) : null}
        <Row
          label={t('mweb.orderDetail.totalPaid')}
          value={money(order.total)}
          strong
          testID="order-total"
        />
        <Row
          label={t('mweb.orderDetail.paymentMethod')}
          value={t(cod ? 'mweb.orderDetail.paymentCod' : 'mweb.orderDetail.paymentPrepaid')}
          testID="order-payment-method"
        />
        {order.payment_ref ? (
          <Row
            label={t('mweb.orderDetail.paymentRef')}
            value={order.payment_ref}
            testID="order-payment-ref"
          />
        ) : null}
      </YStack>
    </YStack>
  );
}
