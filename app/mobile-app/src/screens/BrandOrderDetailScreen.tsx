import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { buildOrderTimeline } from '@duncit/utils';

import { BrandOrderActions } from '@/components/brand-orders/BrandOrderActions';
import { BrandOrderItems } from '@/components/brand-orders/BrandOrderItems';
import { OrderStatusChip } from '@/components/brand-orders/BrandOrderRow';
import { BrandOrderShipment } from '@/components/brand-orders/BrandOrderShipment';
import { DuncitButton } from '@/components/DuncitButton';
import { OrderTrackingTimeline } from '@/components/pod-history/OrderTrackingTimeline';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBrandOrder } from '@/hooks/useBrandOrder';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Brand Orders → one order (/products/orders/:id): its progress, lines,
 * ship-to and shipment, and the actions it allows right now. What the last
 * action did is said at the top. mWeb twin: pages/brand-order-detail-page.
 */
export function BrandOrderDetailScreen() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { id } = useRoute<RouteProp<RootStackParamList, 'BrandOrderDetail'>>().params;
  const desk = useBrandOrder(id);
  const order = desk.order;

  let body;
  if (desk.isLoading && !order) {
    body = (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        color="$primary"
        testID="brand-order-loading"
      />
    );
  } else if (desk.error && !order) {
    body = (
      <YStack gap={12} alignItems="flex-start" testID="brand-order-error">
        <Text role="alert" fontSize={13} color="$danger">
          {desk.error}
        </Text>
        <DuncitButton
          label={t('mweb.brandOrders.retry')}
          variant="outline"
          size="sm"
          testID="brand-order-retry"
          onPress={desk.retry}
        />
      </YStack>
    );
  } else if (order) {
    body = (
      <YStack gap={16}>
        <SurfaceCard gap={8} testID="brand-order-summary">
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            <Text fontSize={16} fontWeight="700" color="$color">
              {t('mweb.brandOrders.orderNo', { vars: { no: order.order_no } })}
            </Text>
            <OrderStatusChip status={order.fulfilment_status} testID="brand-order-status" />
          </XStack>
          <Text fontSize={13} color="$muted">
            {t('mweb.brandOrders.buyer')}: {order.buyer_name} ·{' '}
            {t('mweb.brandOrders.placedOn', { vars: { date: formatDateTime(order.created_at) } })}
          </Text>
          {order.cancelled_at ? (
            <Text role="status" fontSize={13} color="$color" testID="brand-order-cancelled">
              {t('mweb.brandOrders.cancelled')}
            </Text>
          ) : null}
        </SurfaceCard>
        <SurfaceCard gap={12}>
          <Text role="heading" fontSize={14} fontWeight="700" color="$color">
            {t('mweb.brandOrders.shipment')}
          </Text>
          <BrandOrderShipment order={order} />
          <BrandOrderActions
            order={order}
            busy={desk.busy}
            onBook={desk.book}
            onRefresh={desk.refreshTracking}
            onDocument={desk.document}
            onSaveAddress={desk.saveAddress}
          />
        </SurfaceCard>
        <SurfaceCard gap={12}>
          <Text role="heading" fontSize={14} fontWeight="700" color="$color">
            {t('mweb.brandOrders.progress')}
          </Text>
          <OrderTrackingTimeline
            steps={buildOrderTimeline(order, t)}
            testID="brand-order-timeline"
          />
        </SurfaceCard>
        <SurfaceCard>
          <BrandOrderItems order={order} />
        </SurfaceCard>
      </YStack>
    );
  } else {
    body = (
      <Text role="alert" fontSize={13} color="$muted" testID="brand-order-not-found">
        {t('mweb.brandOrders.notFound')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.brandOrders.detailTitle')} testID="brand-order-detail-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {desk.notice ? (
            <Text
              testID="brand-order-notice"
              role={desk.notice.tone === 'error' ? 'alert' : 'status'}
              fontSize={13}
              color={desk.notice.tone === 'error' ? '$danger' : '$success'}
            >
              {desk.notice.text}
            </Text>
          ) : null}
          {body}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
