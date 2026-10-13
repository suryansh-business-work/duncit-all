import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, FormControlLabel, Link, Stack, Switch } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenuRounded';
import { groupFoodMenu, isVegFood, type VenueFoodItem } from '@duncit/utils';
import EmptyState from '../../../components/EmptyState';
import ErrorBoundary from '../../../components/ErrorBoundary';
import MomentLightbox from '../../../components/moments/MomentLightbox';
import SectionHeader from '../../../components/SectionHeader';
import { usePricing } from '../../../hooks/usePricing';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PublicVenue } from '../queries';
import FoodCartBar from './FoodCartBar';
import FoodCartSheet from './FoodCartSheet';
import FoodMenuList from './FoodMenuList';
import { foodOrderPath, recentFoodOrder } from './foodStorage';
import { useFoodOrdering } from './useFoodOrdering';

interface Props {
  venue: PublicVenue;
  /** Re-read the venue — a dish left the menu between the page loading and the order. */
  onRefresh: () => Promise<unknown>;
}

interface Zoom {
  images: string[];
  index: number;
}

/**
 * The venue's menu, and — when it takes QR orders — the cart that goes with
 * it. The menu is always readable: ordering switched off, or closed just now,
 * only takes the Add buttons and the cart away.
 */
function Section({ venue, onRefresh }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const ordering = useFoodOrdering(venue, onRefresh);
  const { cart, canOrder } = ordering;
  const [vegOnly, setVegOnly] = useState(false);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  const menu = venue.food_menu;
  const discountPct = venue.food_ordering.discount_pct;
  // The toggle only earns its place on a menu that has both kinds of dish.
  const mixed = useMemo(() => menu.some((item) => isVegFood(item.diet)) && menu.some((item) => !isVegFood(item.diet)), [menu]);
  const groups = useMemo(
    () => groupFoodMenu(vegOnly && mixed ? menu.filter((item) => isVegFood(item.diet)) : menu),
    [menu, vegOnly, mixed],
  );
  const tracked = useMemo(() => recentFoodOrder(venue.id), [venue.id]);

  const openImage = (item: VenueFoodItem) => setZoom({ images: item.images, index: 0 });

  return (
    <Stack spacing={2} data-testid="venue-food-menu">
      <SectionHeader testId="venue-food-menu-header" title={t('mweb.venueFood.menuTitle')} />
      {tracked && (
        <Link
          component={RouterLink}
          to={foodOrderPath(venue.id, tracked.order_id, tracked.access_key)}
          sx={{ fontWeight: 600 }}
          data-testid="venue-food-track-order"
        >
          {t('mweb.venueFood.trackOrder', { vars: { orderNo: tracked.order_no } })}
        </Link>
      )}
      {ordering.closed && (
        <Alert severity="info" data-testid="venue-food-closed">
          {t('mweb.venueFood.errors.closed')}
        </Alert>
      )}
      {canOrder && discountPct > 0 && (
        <Alert severity="success" icon={false} data-testid="venue-food-discount">
          {t('mweb.venueFood.discountBanner', { vars: { pct: String(discountPct) } })}
        </Alert>
      )}
      {cart.dropped.length > 0 && (
        <Alert severity="warning" onClose={cart.dismissDropped} data-testid="venue-food-dropped">
          {t('mweb.venueFood.cart.dropped', { vars: { names: cart.dropped.join(', ') } })}
        </Alert>
      )}
      {mixed && (
        <FormControlLabel
          control={<Switch checked={vegOnly} onChange={(event) => setVegOnly(event.target.checked)} />}
          label={t('mweb.venueFood.vegOnly')}
          sx={{ alignSelf: 'flex-start', ml: 0 }}
          data-testid="venue-food-veg-only"
        />
      )}
      {groups.length === 0 ? (
        <EmptyState testId="venue-food-menu-empty" icon={<RestaurantMenuIcon />} title={t('mweb.venueFood.menuEmpty')} />
      ) : (
        <FoodMenuList
          groups={groups}
          currency={currency}
          canOrder={canOrder}
          quantityOf={cart.quantityOf}
          onQuantity={cart.setQuantity}
          onOpenImage={openImage}
        />
      )}
      {canOrder && cart.lines.length > 0 && <FoodCartBar price={cart.price} currency={currency} onOpen={ordering.openSheet} />}
      <FoodCartSheet
        open={ordering.sheetOpen}
        onClose={ordering.closeSheet}
        cart={cart}
        currency={currency}
        discountPct={discountPct}
        venueName={venue.venue_name}
        guest={ordering.guest}
        coupon={ordering.coupon}
        submitting={ordering.submitting}
        error={ordering.checkout.error}
        onDismissError={ordering.checkout.clearError}
        onPay={ordering.pay}
      />
      <MomentLightbox
        moments={(zoom?.images ?? []).map((url) => ({ url }))}
        index={zoom ? zoom.index : null}
        onClose={() => setZoom(null)}
        onIndexChange={(index) => setZoom((prev) => (prev ? { ...prev, index } : prev))}
      />
    </Stack>
  );
}

/** Its own boundary: a menu that fails to render never takes the venue page down with it. */
export default function VenueFoodMenu(props: Readonly<Props>) {
  return (
    <ErrorBoundary>
      <Section {...props} />
    </ErrorBoundary>
  );
}
