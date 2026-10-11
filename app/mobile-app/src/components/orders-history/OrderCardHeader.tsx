import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { HistoryOrder } from '@/utils/product-orders';

type OrderFacts = Pick<
  HistoryOrder,
  'id' | 'order_no' | 'created_at' | 'total' | 'currency_symbol'
>;

/** The top of an order card on My Product Orders: when it was placed, what it
 * came to, and the way into its detail screen.
 * mWeb twin: pages/orders-history-page/OrderCardHeader (rule 27). */
export function OrderCardHeader({
  order,
  onOpen,
}: Readonly<{ order: OrderFacts; onOpen: () => void }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { primary } = useThemeColors();
  const label = t('mweb.orderDetail.viewDetails');
  return (
    <XStack alignItems="center" gap={8} flexWrap="wrap">
      <Text flex={1} fontSize={12} color="$muted" testID={`orders-history-meta-${order.id}`}>
        {t('mweb.orderDetail.placedOn', { vars: { date: formatDate(order.created_at) } })}
        {' · '}
        {t('mweb.orderDetail.total', {
          vars: { amount: formatMoney(order.total, { symbol: order.currency_symbol }) },
        })}
      </Text>
      <DuncitButton
        label={label}
        variant="ghost"
        size="sm"
        iconAfter={<MaterialIcons name="chevron-right" size={18} color={primary} />}
        // Starts with the visible label (WCAG 2.5.3), then says which order.
        accessibilityLabel={t('mweb.orderDetail.openOrder', { vars: { orderNo: order.order_no } })}
        testID={`orders-history-view-${order.id}`}
        onPress={onOpen}
      />
    </XStack>
  );
}
