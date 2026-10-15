import type { ComponentProps, ReactNode } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';
import { foodOrderKeyFor, type MyVenueFoodOrder } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { useLoadingRegion } from '@/components/Skeleton';
import type { MyFoodOrders } from '@/hooks/useMyFoodOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { FoodOrderRow } from './FoodOrderRow';

interface Props {
  title: string;
  emptyTitle: string;
  emptyIcon: ComponentProps<typeof MaterialIcons>['name'];
  orders: MyFoodOrders;
  /** Open one order's screen, with the key this device kept for it (null when the account opens it). */
  onOpen: (order: MyVenueFoodOrder, key: string | null) => void;
  testID: string;
}

/**
 * One section of "Your Food Orders" — its heading, then its loading, failed,
 * empty or listed state, and "Show more" while the server holds more.
 * Tamagui twin of mWeb's food-orders-page/FoodOrdersSection.
 */
export function FoodOrdersSection({
  title,
  emptyTitle,
  emptyIcon,
  orders,
  onOpen,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();

  let body: ReactNode;
  if (orders.loading) {
    body = <Spinner {...loadingRegion} testID={`${testID}-loading`} color="$primary" />;
  } else if (orders.failed) {
    body = (
      <EmptyState
        testID={`${testID}-failed`}
        icon="error-outline"
        title={t('mweb.venueFood.myOrders.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={() => fireAndForget(orders.reload())}
      />
    );
  } else if (orders.rows.length === 0) {
    body = <EmptyState testID={`${testID}-empty`} icon={emptyIcon} title={emptyTitle} />;
  } else {
    body = (
      <YStack gap={10} testID={`${testID}-list`}>
        {orders.rows.map((order) => (
          <FoodOrderRow
            key={order.id}
            order={order}
            onOpen={() => onOpen(order, foodOrderKeyFor(orders.keys, order.id))}
          />
        ))}
      </YStack>
    );
  }

  return (
    <YStack gap={12} testID={testID}>
      <SectionHeader testID={`${testID}-header`} title={title} />
      {body}
      {orders.moreFailed ? (
        <Text role="alert" testID={`${testID}-more-failed`} fontSize={13} color="$danger">
          {t('mweb.venueFood.myOrders.loadFailed')}
        </Text>
      ) : null}
      {orders.hasMore && !orders.failed ? (
        <DuncitButton
          testID={`${testID}-more`}
          label={t('mweb.venueFood.myOrders.loadMore')}
          variant="outline"
          fullWidth
          loading={orders.loadingMore}
          onPress={() => fireAndForget(orders.loadMore())}
        />
      ) : null}
    </YStack>
  );
}
