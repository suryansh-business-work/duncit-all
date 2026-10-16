import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { XStack, YStack } from 'tamagui';
import { FOOD_ORDER_LIMITS, groupFoodMenu, type VenueFoodItem } from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionHeader } from '@/components/SectionHeader';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

import { FoodLicenceNote } from './FoodLicenceNote';
import { FoodMenuBrowser } from './FoodMenuBrowser';
import { FoodNotice } from './FoodNotice';
import { FoodRatingBadge } from './FoodRatingBadge';
import { FoodRunningOrders } from './FoodRunningOrders';
import { useVenueFoodOrdering } from './VenueFoodOrderingScope';

type Props = Readonly<{ venue: PublicVenueDetails }>;

/**
 * The venue's menu, and — when it takes QR orders — the cart controls that fill
 * the cart floating over the screen (VenueFoodOrderingScope). The menu is always
 * readable: ordering switched off, or closed just now, only takes the cart
 * controls and the cart away. Tamagui twin of mWeb's food/VenueFoodMenu.
 */
function Section({ venue }: Props) {
  const { t } = useTranslation();
  const { currency } = usePublicFinance();
  const ordering = useVenueFoodOrdering();
  const { cart, canOrder } = ordering;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const groups = useMemo(() => groupFoodMenu(venue.food_menu), [venue.food_menu]);
  const discountPct = venue.food_ordering.discount_pct;

  const openDetails = (item: VenueFoodItem) =>
    navigation.navigate('VenueFoodItem', { venueId: venue.id, itemId: item.id });

  return (
    <YStack gap={12} testID="venue-food-menu">
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <SectionHeader testID="venue-food-menu-header" title={t('mweb.venueFood.menuTitle')} />
        <FoodRatingBadge venueId={venue.id} />
      </XStack>
      <FoodRunningOrders venueId={venue.id} />
      {ordering.closed ? (
        <NoticeCard
          testID="venue-food-closed"
          tone="info"
          title={t('mweb.venueFood.errors.closed')}
        />
      ) : null}
      {canOrder && discountPct > 0 ? (
        <NoticeCard
          testID="venue-food-discount"
          tone="success"
          icon="local-offer"
          title={t('mweb.venueFood.discountBanner', { vars: { pct: String(discountPct) } })}
        />
      ) : null}
      {cart.dropped.length > 0 ? (
        <FoodNotice
          testID="venue-food-dropped"
          tone="warning"
          title={t('mweb.venueFood.cart.dropped', { vars: { names: cart.dropped.join(', ') } })}
          onDismiss={cart.dismissDropped}
        />
      ) : null}
      {cart.atMaxLines ? (
        <FoodNotice
          testID="venue-food-max-lines"
          tone="warning"
          title={t('mweb.venueFood.maxLines', {
            vars: { max: String(FOOD_ORDER_LIMITS.maxLines) },
          })}
          onDismiss={cart.dismissMaxLines}
        />
      ) : null}
      {groups.length === 0 ? (
        <EmptyState
          testID="venue-food-menu-empty"
          icon="restaurant-menu"
          title={t('mweb.venueFood.menuEmpty')}
        />
      ) : (
        <FoodMenuBrowser
          groups={groups}
          currency={currency}
          onOpenDetails={openDetails}
          canOrder={canOrder}
          quantityOf={cart.quantityOf}
          cartReady={cart.hydrated}
          onQuantity={cart.setQuantity}
        />
      )}
      <FoodLicenceNote fssai={venue.food_licences?.fssai_number} />
    </YStack>
  );
}

/** Its own boundary: a menu that fails to render never takes the venue screen down with it. */
export function VenueFoodMenuSection(props: Props) {
  return (
    <ErrorBoundary>
      <Section {...props} />
    </ErrorBoundary>
  );
}
