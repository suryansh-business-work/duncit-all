import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenuePicker from '../../components/venue/VenuePicker';
import { useSelectedVenue } from '../../components/venue/useSelectedVenue';
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
  const venues = data?.myVenues ?? [];
  const { venue, venueId, selectVenue } = useSelectedVenue(venues);

  let body;
  if (loading && !data) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  } else if (error) {
    body = (
      <Alert severity="error" data-testid="venue-food-orders-error">
        {parseApiError(error)}
      </Alert>
    );
  } else if (venue) {
    body = (
      <>
        <VenuePicker venues={venues} value={venueId} onChange={selectVenue} />
        {venue.offers_food ? (
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
        )}
      </>
    );
  } else {
    body = <Alert severity="info">{t('mweb.studioOptions.noVenuesYet')}</Alert>;
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-orders-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodOrders')} hint={t('mweb.studioOptions.foodOrdersHint')} />
      {body}
    </Stack>
  );
}
