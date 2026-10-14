import { useCallback, useEffect, useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  FOOD_ORDERS_POLL_MS,
  foodOrderStatusLabel,
  type FoodOwnerOrder,
  type VenueFoodOrderStatus,
} from '@duncit/utils';

import { useFoodDeskList } from '@/hooks/useFoodDesk';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchFoodOrdersPage, setFoodOrderStatus } from '@/services/venue-food-owner';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { FoodListState } from './FoodDeskBits';
import { FoodOrderCancelSheet } from './FoodOrderCancelSheet';
import { FoodOrderCard } from './FoodOrderCard';
import { FoodOrderDetailsSheet } from './FoodOrderDetailsSheet';

/** The last answer the board got — what moved, or why it did not. */
type Notice = { tone: 'ok' | 'error'; text: string } | null;

/**
 * A venue's order board: its paid orders newest first, each moved through the
 * kitchen or cancelled with a full refund. It asks again every 20 seconds so a
 * new order shows up unprompted — paused while a sheet is open, so the order
 * being read or cancelled does not shift underneath the owner.
 */
export function VenueFoodOrdersBody({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const list = useFoodDeskList(fetchFoodOrdersPage, venueId);
  const { refetch, replaceRow } = list;
  const [viewing, setViewing] = useState<FoodOwnerOrder | null>(null);
  const [cancelling, setCancelling] = useState<FoodOwnerOrder | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const sheetOpen = viewing !== null || cancelling !== null;
  useEffect(() => {
    if (sheetOpen) return undefined;
    const timer = globalThis.setInterval(() => fireAndForget(refetch()), FOOD_ORDERS_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [sheetOpen, refetch]);

  const advance = useCallback(
    async (order: FoodOwnerOrder, next: VenueFoodOrderStatus) => {
      try {
        replaceRow(await setFoodOrderStatus(order.id, next));
        setNotice({
          tone: 'ok',
          text: t('venueFoodOwner.orders.advanced', {
            vars: { no: order.order_no, status: foodOrderStatusLabel(t, next) },
          }),
        });
      } catch (err) {
        setNotice({ tone: 'error', text: toErrorMessage(err) });
        // A refusal usually means the order moved elsewhere — show what the server holds now.
        fireAndForget(refetch());
      }
    },
    [refetch, replaceRow, t],
  );

  return (
    <YStack gap={12} testID="food-orders">
      {notice ? (
        <Text
          role={notice.tone === 'ok' ? 'status' : 'alert'}
          testID="food-orders-notice"
          fontSize={13}
          color={notice.tone === 'ok' ? '$success' : '$danger'}
        >
          {notice.text}
        </Text>
      ) : null}
      {list.rows.map((order) => (
        <FoodOrderCard
          key={order.id}
          order={order}
          onAdvance={advance}
          onView={setViewing}
          onCancel={setCancelling}
        />
      ))}
      <FoodListState
        isLoading={list.isLoading}
        error={list.error}
        empty={list.rows.length === 0}
        emptyText={t('venueFoodOwner.orders.empty')}
        hasMore={list.hasMore}
        loadingMore={list.loadingMore}
        onLoadMore={() => fireAndForget(list.loadMore())}
        testID="food-orders"
      />
      <FoodOrderDetailsSheet order={viewing} onClose={() => setViewing(null)} />
      <FoodOrderCancelSheet
        order={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={(order, message) => {
          replaceRow(order);
          setNotice({ tone: 'ok', text: message });
          setCancelling(null);
        }}
      />
    </YStack>
  );
}
