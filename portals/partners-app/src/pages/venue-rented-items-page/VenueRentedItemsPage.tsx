import { Fragment } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { FOOD_OWNER_VENUES } from '@duncit/venue-food';
import { VenueRentalDesk } from '@duncit/venue-rentals';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueStudioBody from '../../components/venue/VenueStudioBody';

/**
 * Rented Items — what the selected venue rents out with a pod booking, its
 * numbers and its bookings to mark back. The desk is @duncit/venue-rentals',
 * the same one mWeb and the Venues console mount.
 */
export default function VenueRentedItemsPage() {
  const { t } = useTranslation();
  // The owner's venue list (any venue, food or not) — the picker reads only id and name.
  const { data, loading, error } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-rented-items-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-rented-items-page">
      <StudioPageHeader title={t('venueRentals.items.pageTitle')} hint={t('venueRentals.items.pageHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) => (
          <Fragment key={venue.id}>
            <VenueRentalDesk venueId={venue.id} surface="partners-app" mode="owner" />
          </Fragment>
        )}
      </VenueStudioBody>
    </Stack>
  );
}
