import { useEffect, useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { EmptyState } from '@/components/EmptyState';
import { PodProductOrderItem } from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { MyProductOrdersDocument } from '@/graphql/product-orders';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

type OrderRow = ResultOf<typeof MyProductOrdersDocument>['myProductOrders'][number];

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each in its own card with full fulfilment tracking.
 * RN twin of mWeb's OrdersHistoryPage. */
export function OrdersHistoryScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    graphqlRequest(MyProductOrdersDocument, undefined, { auth: true })
      .then((data) => active && setOrders(data.myProductOrders))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load your orders.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  let body;
  if (isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={48} testID="orders-loading">
        <Spinner size="large" />
      </YStack>
    );
  } else if (error) {
    body = (
      <Text testID="orders-error" padding={24} color="$danger">
        {error}
      </Text>
    );
  } else if (orders.length === 0) {
    body = <EmptyState testID="orders-empty" icon="local-shipping" title="No product orders yet" />;
  } else {
    body = (
      <YStack gap={16} padding={16}>
        {orders.map((order) => (
          <SurfaceCard key={order.id} gap={8}>
            {order.pod?.pod_title ? (
              <Text fontSize={12} fontWeight="600" color="$muted" numberOfLines={1}>
                {order.pod.pod_title}
              </Text>
            ) : null}
            <PodProductOrderItem order={order} />
          </SurfaceCard>
        ))}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.ordersHistory.myProductOrders')} testID="orders-history-screen">
      <RefreshScrollView flex={1}>{body}</RefreshScrollView>
    </StackScreen>
  );
}
