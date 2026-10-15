import type { ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, YStack } from 'tamagui';
import { findFoodItem } from '@duncit/utils';

import { FoodItemDetails } from '@/components/details/venue-food/FoodItemDetails';
import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useVenueDetails } from '@/hooks/useHostsVenues';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * A dish's own screen (mWeb /venue/:venueId/food/:itemId), opened from its
 * name on the menu. It reads the same venue the menu does, so the dish, its
 * price and whether it can be ordered are exactly what the menu shows.
 * RN twin of mWeb's venue-food-item-page.
 */
export function VenueFoodItemScreen() {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VenueFoodItem'>>();
  const venueId = route.params?.venueId ?? '';
  const itemId = route.params?.itemId ?? '';
  const { venue, isLoading, error, refetch } = useVenueDetails(venueId);
  const item = venue?.offers_food ? findFoodItem(venue.food_menu, itemId) : null;

  const backToMenu = venueId ? (
    <DuncitButton
      testID="food-item-back-to-menu"
      label={t('mweb.venueFood.order.backToMenu')}
      variant="outline"
      fullWidth
      onPress={() => navigation.popTo('VenueDetails', { venueId })}
    />
  ) : null;

  let body: ReactNode;
  if (isLoading && !venue) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner {...loadingRegion} testID="food-item-loading" color="$primary" />
      </YStack>
    );
  } else if (venue && item) {
    body = (
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        <FoodItemDetails venue={venue} item={item} />
        {backToMenu}
      </RefreshScrollView>
    );
  } else if (error && !venue) {
    body = (
      <EmptyState
        testID="food-item-load-failed"
        icon="error-outline"
        title={t('mweb.venueFood.item.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={() => fireAndForget(refetch())}
      />
    );
  } else {
    body = (
      <YStack flex={1} padding={16} gap={16}>
        <EmptyState
          testID="food-item-missing"
          icon="restaurant-menu"
          title={t('mweb.venueFood.item.notFound')}
        />
        {backToMenu}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.venueFood.item.title')} testID="food-item-screen">
      {body}
    </StackScreen>
  );
}
