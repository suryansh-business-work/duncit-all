import { Text, XStack } from 'tamagui';
import { fulfilmentLabel } from '@duncit/utils';

import { OrderStatusChip } from '@/components/brand-orders/BrandOrderRow';
import { OrderStatusNotes } from '@/components/orders-history/OrderStatusNotes';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { OrderDetail } from '@/hooks/useOrderDetail';
import { useTranslation } from '@/hooks/useTranslation';

/** The head of the order: the pod it was bought on, its number and status,
 * when it was placed and how it is fulfilled, then its settled facts
 * (delivered / cancelled and the refund). The summary block of mWeb's
 * order-detail-page. */
export function OrderSummaryCard({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <SurfaceCard gap={8} testID="order-summary">
      {order.pod?.pod_title ? (
        <Text fontSize={12} fontWeight="600" color="$muted" numberOfLines={1}>
          {order.pod.pod_title}
        </Text>
      ) : null}
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <Text role="heading" fontSize={16} fontWeight="700" color="$color" testID="order-number">
          {t('mweb.orderDetail.orderNo', { vars: { orderNo: order.order_no } })}
        </Text>
        <OrderStatusChip status={order.fulfilment_status} testID="order-status" />
      </XStack>
      <Text fontSize={13} color="$muted" testID="order-placed">
        {t('mweb.orderDetail.placedOn', { vars: { date: formatDateTime(order.created_at) } })}
        {' · '}
        {fulfilmentLabel(order.fulfilment_method, t)}
      </Text>
      <OrderStatusNotes order={order} />
    </SurfaceCard>
  );
}
