import { useMemo, useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { OrderReturnsSection, PodShopReturnSheet } from '@/components/orders-history';
import { PodProductOrderItem } from '@/components/pod-history';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useCancelPodShopReturn } from '@/hooks/useCancelPodShopReturn';
import { useOrdersHistory } from '@/hooks/useOrdersHistory';
import { useTranslation } from '@/hooks/useTranslation';
import { groupReturnsByOrder } from '@/utils/pod-shop-returns';
import type { HistoryOrder, PodShopReturn } from '@/utils/product-orders';

const NO_RETURNS: readonly PodShopReturn[] = [];

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each in its own card with full fulfilment tracking,
 * its cancellation/refund state, and its returns. RN twin of mWeb's OrdersHistoryPage. */
export function OrdersHistoryScreen() {
  const loadingRegion = useLoadingRegion();
  const { t } = useTranslation();
  const { orders, returns, isLoading, error, returnsError, reload } = useOrdersHistory();
  const [returnOrder, setReturnOrder] = useState<HistoryOrder | null>(null);
  const [notice, setNotice] = useState('');
  const byOrder = useMemo(() => groupReturnsByOrder(returns), [returns]);
  const cancel = useCancelPodShopReturn(() => {
    setNotice(t('mweb.podShopReturns.cancelled'));
    reload().catch(() => undefined);
  });

  const retry = (
    <DuncitButton
      label={t('mweb.ordersHistory.retry')}
      variant="outline"
      size="sm"
      testID="orders-retry"
      onPress={() => {
        reload().catch(() => undefined);
      }}
    />
  );

  let body;
  if (isLoading && orders.length === 0) {
    body = (
      <YStack alignItems="center" paddingVertical={48} testID="orders-loading">
        <Spinner {...loadingRegion} size="large" />
      </YStack>
    );
  } else if (error && orders.length === 0) {
    body = (
      <YStack gap={12} padding={24} alignItems="flex-start" testID="orders-error">
        <Text role="alert" color="$danger">
          {error}
        </Text>
        {retry}
      </YStack>
    );
  } else if (orders.length === 0) {
    body = <EmptyState testID="orders-empty" icon="local-shipping" title={t('mweb.ordersHistory.empty')} />;
  } else {
    body = (
      <YStack gap={16} padding={16}>
        {orders.map((order) => (
          <SurfaceCard key={order.id} gap={8} testID={`orders-history-order-${order.id}`}>
            {order.pod?.pod_title ? (
              <Text fontSize={12} fontWeight="600" color="$muted" numberOfLines={1}>
                {order.pod.pod_title}
              </Text>
            ) : null}
            <PodProductOrderItem order={order} />
            <OrderReturnsSection
              order={order}
              returns={byOrder.get(order.id) ?? NO_RETURNS}
              onReturn={setReturnOrder}
              onCancelReturn={cancel.ask}
            />
          </SurfaceCard>
        ))}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.ordersHistory.myProductOrders')} testID="orders-history-screen">
      <RefreshScrollView flex={1}>
        {notice || cancel.error ? (
          <Text
            testID="orders-notice"
            role={cancel.error ? 'alert' : 'status'}
            paddingHorizontal={16}
            paddingTop={12}
            fontSize={13}
            color={cancel.error ? '$danger' : '$color'}
          >
            {cancel.error || notice}
          </Text>
        ) : null}
        {returnsError && orders.length > 0 ? (
          <YStack gap={8} paddingHorizontal={16} paddingTop={12} testID="orders-returns-error">
            <Text role="alert" fontSize={13} color="$danger">
              {returnsError}
            </Text>
            {retry}
          </YStack>
        ) : null}
        {body}
      </RefreshScrollView>
      <PodShopReturnSheet
        order={returnOrder}
        onClose={() => setReturnOrder(null)}
        onRequested={() => {
          setNotice(t('mweb.podShopReturns.requested'));
          reload().catch(() => undefined);
        }}
      />
      <ConfirmDialog
        open={!!cancel.target}
        title={t('mweb.podShopReturns.cancelConfirmTitle')}
        message={t('mweb.podShopReturns.cancelConfirmMessage', {
          vars: { returnNo: cancel.target?.return_no ?? '' },
        })}
        confirmLabel={t('mweb.podShopReturns.cancelReturn')}
        cancelLabel={t('mweb.podShopReturns.keepReturn')}
        destructive
        busy={cancel.busy}
        onConfirm={cancel.confirm}
        onCancel={cancel.dismiss}
        testID="pod-shop-return-withdraw-dialog"
      />
    </StackScreen>
  );
}
