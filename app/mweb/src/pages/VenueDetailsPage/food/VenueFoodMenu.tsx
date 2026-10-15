import { useMemo, useState } from 'react';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
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
import FoodLicenceNote from './FoodLicenceNote';
import FoodMenuBrowser from './FoodMenuBrowser';
import FoodRatingBadge from './FoodRatingBadge';
import FoodRunningOrders from './FoodRunningOrders';
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

  const openImage = (item: VenueFoodItem) => setZoom({ images: item.images, index: 0 });

  return (
    <Stack spacing={2} data-testid="venue-food-menu">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader testId="venue-food-menu-header" title={t('mweb.venueFood.menuTitle')} />
        <FoodRatingBadge venueId={venue.id} />
      </Stack>
      <FoodRunningOrders venueId={venue.id} />
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
        <FoodMenuBrowser
          venueId={venue.id}
          groups={groups}
          currency={currency}
          canOrder={canOrder}
          quantityOf={cart.quantityOf}
          onQuantity={cart.setQuantity}
          onOpenImage={openImage}
        />
      )}
      <FoodLicenceNote fssai={venue.food_licences?.fssai_number} />
      {canOrder && cart.lines.length > 0 && <FoodCartBar price={cart.price} currency={currency} onOpen={ordering.openSheet} />}
      <FoodCartSheet
        open={ordering.sheetOpen}
        onClose={ordering.closeSheet}
        cart={cart}
        currency={currency}
        discountPct={discountPct}
        venueId={venue.id}
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
