import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodProductOrderItem } from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { MyProductOrdersDocument } from '@/graphql/product-orders';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';

type OrderRow = ResultOf<typeof MyProductOrdersDocument>['myProductOrders'][number];

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each with its full fulfilment tracking. RN twin of
 * mWeb's OrdersHistoryPage. */
export function OrdersHistoryScreen() {
  const { muted } = useThemeColors();
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
    body = (
      <YStack alignItems="center" gap={10} paddingVertical={64} testID="orders-empty">
        <MaterialIcons name="local-shipping" size={44} color={muted} />
        <Text fontSize={17} fontWeight="900" color="$color">
          No product orders yet
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          Products you buy from a pod&apos;s shop will show up here with tracking.
        </Text>
      </YStack>
    );
  } else {
    body = (
      <YStack gap={12} padding={16}>
        {orders.map((order) => (
          <YStack key={order.id} gap={4}>
            {order.pod?.pod_title ? (
              <Text fontSize={11.5} fontWeight="800" color="$muted">
                {order.pod.pod_title}
              </Text>
            ) : null}
            <PodProductOrderItem order={order} />
          </YStack>
        ))}
      </YStack>
    );
  }

  return (
    <StackScreen title="My Product Orders" testID="orders-history-screen">
      <ScrollView flex={1}>{body}</ScrollView>
    </StackScreen>
  );
}
