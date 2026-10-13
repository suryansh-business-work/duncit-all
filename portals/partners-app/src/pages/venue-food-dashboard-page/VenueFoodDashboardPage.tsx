import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueFoodOffAlert from '../../components/venue/VenueFoodOffAlert';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import { FOOD_ORDER_VENUES } from '../venue-food-orders-page/queries';
import VenueFoodDashboard from './VenueFoodDashboard';

/**
 * Food Dashboard — the selected venue's food numbers for a period the owner
 * picks: what was ordered and earned, how the orders ended, which dishes sold,
 * how guests rated them and how often the venue's QRs were scanned. A venue
 * that does not offer food has no numbers; it gets the way to switch food on.
 */
export default function VenueFoodDashboardPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_ORDER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-food-dashboard-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-dashboard-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodDashboard')} hint={t('mweb.studioOptions.foodDashboardHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) =>
          venue.offers_food ? (
            <VenueFoodDashboard key={venue.id} venueId={venue.id} />
          ) : (
            <VenueFoodOffAlert
              venueId={venue.id}
              message={t('partners.foodDashboard.noFood')}
              data-testid="venue-food-dashboard-no-food"
            />
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
