import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
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
            <Alert
              severity="info"
              data-testid="venue-food-orders-no-food"
              action={
                <DuncitButton
                  size="small"
                  color="inherit"
                  component={RouterLink}
                  to={`/register-venue/${venue.id}?selectedtab=type-capacity`}
                >
                  {t('partners.foodOrders.editVenue')}
                </DuncitButton>
              }
            >
              {t('partners.foodOrders.noFood')}
            </Alert>
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
