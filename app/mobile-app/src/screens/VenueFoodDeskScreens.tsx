import { FoodDeskFrame } from '@/components/venue-food-desk/FoodDeskFrame';
import { VenueFoodCouponsBody } from '@/components/venue-food-desk/VenueFoodCouponsBody';
import { VenueFoodDashboardBody } from '@/components/venue-food-desk/VenueFoodDashboardBody';
import { VenueFoodOrdersBody } from '@/components/venue-food-desk/VenueFoodOrdersBody';
import { VenueFoodMenuBody } from '@/components/venue-food-desk/menu/VenueFoodMenuBody';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Venue Options → the food desk (/venues/food-dashboard, /food-menu,
 * /food-orders, /food-coupons): the selected venue's Food Dashboard, food
 * menu, order board and food coupons — the Tamagui twins of the tools the Partners console, the Venues
 * console and mWeb mount from @duncit/venue-food, on the same @duncit/utils
 * documents, labels and @duncit/forms rules.
 */
export function VenueFoodDashboardScreen() {
  const { t } = useTranslation();
  return (
    <FoodDeskFrame
      title={t('mweb.studioOptions.foodDashboard')}
      testID="venue-food-dashboard-screen"
      noFoodMessage={t('venueFoodOwner.dashboard.noFood')}
    >
      {(venueId) => <VenueFoodDashboardBody venueId={venueId} />}
    </FoodDeskFrame>
  );
}

/** The menu is where food is switched on, so it shows for every venue — no "no food" stop. */
export function VenueFoodMenuScreen() {
  const { t } = useTranslation();
  return (
    <FoodDeskFrame title={t('mweb.studioOptions.foodMenu')} testID="venue-food-menu-screen">
      {(venueId) => <VenueFoodMenuBody venueId={venueId} />}
    </FoodDeskFrame>
  );
}

export function VenueFoodOrdersScreen() {
  const { t } = useTranslation();
  return (
    <FoodDeskFrame
      title={t('mweb.studioOptions.foodOrders')}
      testID="venue-food-orders-screen"
      noFoodMessage={t('venueFoodOwner.orders.noFood')}
    >
      {(venueId) => <VenueFoodOrdersBody venueId={venueId} />}
    </FoodDeskFrame>
  );
}

export function VenueFoodCouponsScreen() {
  const { t } = useTranslation();
  return (
    <FoodDeskFrame
      title={t('mweb.studioOptions.foodCoupons')}
      testID="venue-food-coupons-screen"
      noFoodMessage={t('venueFoodOwner.coupons.noFood')}
    >
      {(venueId) => <VenueFoodCouponsBody venueId={venueId} />}
    </FoodDeskFrame>
  );
}
