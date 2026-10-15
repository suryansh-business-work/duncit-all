import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { Skeleton, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenuRounded';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { findFoodItem } from '@duncit/utils';
import { useEntityPageMeta } from '../../app/pageMeta';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { venueUrl } from '../../utils/seoUrls';
import { PUBLIC_VENUE, type PublicVenue } from '../VenueDetailsPage/queries';
import FoodItemDetails from './FoodItemDetails';

/**
 * A dish's own page (/venue/:venueId/food/:itemId), opened from its name on
 * the menu. Public like the menu. It reads the same venue document the menu
 * does — from the cache when the guest came from the menu — so the dish, its
 * price and whether it can be ordered are exactly what the menu shows.
 */
export default function VenueFoodItemPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { venueId = '', itemId = '' } = useParams();
  const { data, loading, error, refetch } = useQuery<{ publicVenue: PublicVenue | null }>(PUBLIC_VENUE, {
    variables: { venueId },
    skip: !venueId,
  });
  const venue = data?.publicVenue ?? null;
  const item = venue?.offers_food ? findFoodItem(venue.food_menu, itemId) : null;
  useEntityPageMeta(item?.name);

  const menuPath = venueUrl(venueId);
  const backToMenu = (
    <DuncitButton component={RouterLink} to={menuPath} variant="outlined" fullWidth data-testid="food-item-back-to-menu">
      {t('mweb.venueFood.order.backToMenu')}
    </DuncitButton>
  );
  const reload = () => {
    refetch().catch((reloadError: unknown) => logs.mWeb.warn('venueFood', 'reloadItem', { error: reloadError, venueId, itemId }));
  };

  let body: ReactNode;
  if (loading && !data) {
    body = <Skeleton variant="rounded" height={420} role="progressbar" aria-label={t('mweb.a11y.loading')} data-testid="food-item-loading" />;
  } else if (venue && item) {
    body = (
      <>
        <FoodItemDetails venue={venue} item={item} />
        {backToMenu}
      </>
    );
  } else if (error && !venue) {
    body = (
      <EmptyState
        testId="food-item-load-failed"
        icon={<ErrorOutlineIcon />}
        title={t('mweb.venueFood.item.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={reload}
      />
    );
  } else {
    body = (
      <>
        <EmptyState testId="food-item-missing" icon={<RestaurantMenuIcon />} title={t('mweb.venueFood.item.notFound')} />
        {venueId && backToMenu}
      </>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 0.5, pb: 4 }} data-testid="food-item-screen">
      <PageHeader testId="food-item-header" title={t('mweb.venueFood.item.title')} onBack={() => navigate(menuPath)} />
      {body}
    </Stack>
  );
}
