import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { formatMoney, FULFILMENT_TONE, statusLabel, type FulfilmentStatus } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BrandOrderRow as Row } from '@/hooks/useBrandOrders';
import { ToneChip } from './ToneChip';

/** An order's status chip — a status this app does not know yet reads neutral, never blank. */
export function OrderStatusChip({ status, testID }: Readonly<{ status: string; testID?: string }>) {
  const { t } = useTranslation();
  const tone = FULFILMENT_TONE[status as FulfilmentStatus] ?? 'neutral';
  return <ToneChip label={statusLabel(status, t)} tone={tone} testID={testID} />;
}

/** One order on Brand Orders: number, buyer, items, total, status and AWB.
 * Pressing it opens the order. RN twin of mWeb's BrandOrderCard. */
export function BrandOrderRow({ order, onOpen }: Readonly<{ order: Row; onOpen: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const items = order.line_items.reduce((sum, line) => sum + line.qty, 0);
  const awb = order.shiprocket.awb;
  return (
    <XStack
      testID={`brand-order-${order.id}`}
      role="button"
      aria-label={t('mweb.brandOrders.openOrder', { vars: { no: order.order_no } })}
      tabIndex={0}
      onPress={onOpen}
      pressStyle={PRESS_STYLE.row}
      alignItems="center"
      gap={10}
      paddingHorizontal={16}
      paddingVertical={12}
      minHeight={48}
    >
      <YStack flex={1} minWidth={0} gap={4}>
        <XStack alignItems="center" gap={8} flexWrap="wrap">
          <Text fontSize={15} fontWeight="700" color="$color">
            {t('mweb.brandOrders.orderNo', { vars: { no: order.order_no } })}
          </Text>
          <OrderStatusChip
            status={order.fulfilment_status}
            testID={`brand-order-status-${order.id}`}
          />
        </XStack>
        <Text fontSize={13} color="$muted" numberOfLines={1}>
          {order.buyer_name} ·{' '}
          {t('mweb.brandOrders.itemsCount', { count: items, vars: { count: items } })}
        </Text>
        <Text fontSize={12} color="$muted" testID={`brand-order-awb-${order.id}`}>
          {awb ? t('mweb.brandOrders.awb', { vars: { awb } }) : t('mweb.brandOrders.noAwb')}
        </Text>
      </YStack>
      <Text fontSize={14} fontWeight="700" color="$color">
        {formatMoney(order.total, { symbol: order.currency_symbol })}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </XStack>
  );
}
