import { Text, YStack } from 'tamagui';
import { formatMoney, refundCopy } from '@duncit/utils';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProductOrder } from '@/utils/product-orders';

type OrderFacts = Pick<
  ProductOrder,
  | 'id'
  | 'currency_symbol'
  | 'fulfilment_status'
  | 'delivered_at'
  | 'cancelled_at'
  | 'cancel_reason'
  | 'refund'
>;

/** The order's settled facts: when it was delivered, or that it was cancelled
 * (why, and where the refund stands). Renders nothing for an order in flight.
 * mWeb twin: pages/orders-history-page/OrderStatusNotes (rule 27). */
export function OrderStatusNotes({ order }: Readonly<{ order: OrderFacts }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const cancelled = !!order.cancelled_at || order.fulfilment_status === 'CANCELLED';

  if (!cancelled) {
    if (!order.delivered_at) return null;
    return (
      <Text testID={`po-delivered-${order.id}`} fontSize={11} color="$muted">
        {t('mweb.ordersHistory.deliveredOn', { vars: { date: formatDate(order.delivered_at) } })}
      </Text>
    );
  }

  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const refundLines = refundCopy(order.refund, money, formatDate);

  return (
    <YStack
      testID={`po-cancelled-${order.id}`}
      borderRadius={12}
      backgroundColor="$surface"
      padding={10}
      gap={2}
    >
      <Text fontSize={13} fontWeight="600" color="$color">
        {order.cancelled_at
          ? t('mweb.ordersHistory.cancelledOn', { vars: { date: formatDate(order.cancelled_at) } })
          : t('mweb.ordersHistory.cancelled')}
      </Text>
      {order.cancel_reason ? (
        <Text fontSize={12} color="$muted">
          {t('mweb.ordersHistory.cancelReason', { vars: { reason: order.cancel_reason } })}
        </Text>
      ) : null}
      {refundLines.map((line, index) => (
        <Text key={line.key} testID={`po-refund-${order.id}-${index}`} fontSize={12} color="$color">
          {t(line.key, { vars: line.vars })}
        </Text>
      ))}
    </YStack>
  );
}
