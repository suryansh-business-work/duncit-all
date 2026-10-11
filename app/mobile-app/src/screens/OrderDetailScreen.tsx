import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';
import { buildDetailedOrderTimeline, orderSupportDraft } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import {
  OrderActionsCard,
  OrderDetailTimeline,
  OrderItemsCard,
  OrderShipmentCard,
  OrderSummaryCard,
} from '@/components/order-detail';
import {
  OrderReturnsSection,
  PodShopReturnSheet,
  PodShopReturnWithdrawDialog,
} from '@/components/orders-history';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useCancelPodShopReturn } from '@/hooks/useCancelPodShopReturn';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * My Product Orders → one order (orders/:orderId): where it is and every scan
 * that got it there, how it reaches the buyer, what was bought and paid, its
 * cancellation / refund and returns, the invoices and a way to ask for help.
 * What the last action did is said at the top. mWeb twin: pages/order-detail-page.
 */
export function OrderDetailScreen() {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { orderId } = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>().params;
  const desk = useOrderDetail(orderId);
  const { order, setNotice } = desk;
  const [returning, setReturning] = useState(false);
  // A failed reload lands in the hook's `error` / `returnsError`, rendered below.
  const reload = () => {
    desk.reload().catch(() => undefined);
  };
  const cancel = useCancelPodShopReturn(() => {
    setNotice({ tone: 'success', text: t('mweb.podShopReturns.cancelled') });
    reload();
  });
  const notice = cancel.error ? { tone: 'error' as const, text: cancel.error } : desk.notice;

  let body;
  if (desk.isLoading && !order) {
    body = (
      <YStack alignItems="center" paddingVertical={48} testID="order-detail-loading">
        <Spinner {...loadingRegion} size="large" />
      </YStack>
    );
  } else if (desk.error && !order) {
    body = (
      <YStack gap={12} alignItems="flex-start" testID="order-detail-error">
        <Text role="alert" fontSize={13} color="$danger">
          {desk.error}
        </Text>
        <DuncitButton
          label={t('mweb.ordersHistory.retry')}
          variant="outline"
          size="sm"
          testID="order-detail-retry"
          onPress={reload}
        />
      </YStack>
    );
  } else if (order) {
    body = (
      <YStack gap={16}>
        <OrderSummaryCard order={order} />
        <SurfaceCard gap={12}>
          <Text role="heading" fontSize={14} fontWeight="700" color="$color">
            {t('mweb.orderDetail.tracking')}
          </Text>
          <OrderDetailTimeline
            steps={buildDetailedOrderTimeline(order, t)}
            testID="order-timeline"
          />
        </SurfaceCard>
        <SurfaceCard>
          <OrderShipmentCard order={order} onNotice={setNotice} />
        </SurfaceCard>
        <SurfaceCard>
          <OrderItemsCard order={order} />
        </SurfaceCard>
        {desk.returnsError ? (
          <Text role="alert" fontSize={13} color="$danger" testID="order-returns-error">
            {desk.returnsError}
          </Text>
        ) : null}
        <OrderReturnsSection
          order={order}
          returns={desk.returns}
          onReturn={() => setReturning(true)}
          onCancelReturn={cancel.ask}
        />
        <SurfaceCard>
          <OrderActionsCard
            order={order}
            downloading={desk.downloading}
            onInvoice={() => fireAndForget(desk.downloadInvoice(order))}
            onSellerInvoice={() => fireAndForget(desk.downloadSellerInvoice(order))}
            onHelp={() => navigation.navigate('SupportTickets', orderSupportDraft(order, t))}
          />
        </SurfaceCard>
      </YStack>
    );
  } else {
    body = (
      <YStack gap={8} testID="order-detail-not-found">
        <EmptyState
          testID="order-detail-empty"
          icon="receipt-long"
          title={t('mweb.orderDetail.notFoundTitle')}
          actionLabel={t('mweb.orderDetail.backToOrders')}
          onAction={() => navigation.navigate('OrdersHistory')}
          actionTestID="order-detail-back-to-orders"
        />
        <Text fontSize={13} color="$muted" textAlign="center">
          {t('mweb.orderDetail.notFoundBody')}
        </Text>
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.orderDetail.title')} testID="order-detail-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {notice ? (
            <Text
              testID="order-detail-notice"
              role={notice.tone === 'error' ? 'alert' : 'status'}
              fontSize={13}
              color={notice.tone === 'error' ? '$danger' : '$success'}
            >
              {notice.text}
            </Text>
          ) : null}
          {body}
        </YStack>
      </RefreshScrollView>
      <PodShopReturnSheet
        order={returning ? order : null}
        onClose={() => setReturning(false)}
        onRequested={() => {
          setNotice({ tone: 'success', text: t('mweb.podShopReturns.requested') });
          reload();
        }}
      />
      <PodShopReturnWithdrawDialog cancel={cancel} />
    </StackScreen>
  );
}
