import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueFoodOffAlert from '../../components/venue/VenueFoodOffAlert';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import { FOOD_ORDER_VENUES } from '../venue-food-orders-page/queries';
import VenueFoodCouponsTable from './VenueFoodCouponsTable';

/**
 * Food Coupons — the codes the selected venue gives its own food guests. The
 * venue funds them and they work on that venue's food orders only. A venue
 * that does not offer food has no orders to discount; it gets the way to
 * switch food on instead.
 */
export default function VenueFoodCouponsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_ORDER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-food-coupons-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-coupons-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodCoupons')} hint={t('mweb.studioOptions.foodCouponsHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) =>
          venue.offers_food ? (
            <VenueFoodCouponsTable key={venue.id} venueId={venue.id} />
          ) : (
            <VenueFoodOffAlert
              venueId={venue.id}
              message={t('partners.foodCoupons.noFood')}
              data-testid="venue-food-coupons-no-food"
            />
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
