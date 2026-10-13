import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueFoodOffAlert from '../../components/venue/VenueFoodOffAlert';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import VenueFoodOrdersTable from './VenueFoodOrdersTable';
import { FOOD_ORDER_VENUES } from './queries';

/**
 * Food Orders — the paid orders guests placed by scanning the selected venue's
 * QR. The owner moves each one through the kitchen, or cancels it with a full
 * refund. A venue that does not offer food has no board; it gets the way to
 * switch food on instead.
 */
export default function VenueFoodOrdersPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_ORDER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-food-orders-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-orders-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodOrders')} hint={t('mweb.studioOptions.foodOrdersHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) =>
          venue.offers_food ? (
            <VenueFoodOrdersTable key={venue.id} venueId={venue.id} />
          ) : (
            <VenueFoodOffAlert
              venueId={venue.id}
              message={t('partners.foodOrders.noFood')}
              data-testid="venue-food-orders-no-food"
            />
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
