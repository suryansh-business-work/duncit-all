import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MY_FOOD_ORDERS_PAGE_SIZE, type MyVenueFoodOrder } from '@duncit/utils';

import { RefreshScrollView, useRefreshRegistration } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { FoodOrdersSection } from '@/components/venue-food-orders/FoodOrdersSection';
import { useMyFoodOrders } from '@/hooks/useMyFoodOrders';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Your Food Orders (mWeb /food-orders) — the orders still with a kitchen, then
 * the ones served or cancelled, a page at a time: every order the member's
 * account placed, and any this device placed without it.
 * RN twin of mWeb's food-orders-page.
 */
export function MyFoodOrdersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const current = useMyFoodOrders('CURRENT', MY_FOOD_ORDERS_PAGE_SIZE.current);
  const past = useMyFoodOrders('PAST', MY_FOOD_ORDERS_PAGE_SIZE.past);

  // The screen's pull gesture re-reads both lists.
  const reloadCurrent = current.reload;
  const reloadPast = past.reload;
  useRefreshRegistration(
    useCallback(async () => {
      await Promise.all([reloadCurrent(), reloadPast()]);
    }, [reloadCurrent, reloadPast]),
  );

  const open = (order: MyVenueFoodOrder, key: string | null) =>
    navigation.navigate('VenueFoodOrder', {
      venueId: order.venue_id,
      orderId: order.id,
      key: key ?? undefined,
    });

  return (
    <StackScreen title={t('mweb.venueFood.myOrders.title')} testID="food-orders-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}
      >
        <FoodOrdersSection
          testID="food-orders-current"
          title={t('mweb.venueFood.myOrders.current')}
          emptyTitle={t('mweb.venueFood.myOrders.currentEmpty')}
          emptyIcon="restaurant"
          orders={current}
          onOpen={open}
        />
        <FoodOrdersSection
          testID="food-orders-past"
          title={t('mweb.venueFood.myOrders.past')}
          emptyTitle={t('mweb.venueFood.myOrders.pastEmpty')}
          emptyIcon="receipt-long"
          orders={past}
          onOpen={open}
        />
      </RefreshScrollView>
    </StackScreen>
  );
}
