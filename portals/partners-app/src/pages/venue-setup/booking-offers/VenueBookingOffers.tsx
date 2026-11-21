import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import BookingOffersCard from './BookingOffersCard';
import { MY_VENUES_OFFERS, type BookingOffersVenue } from './queries';

/**
 * Fees & Minimum Spend > Booking offers & minimum spend, for the venue picked
 * on the page: reads its stored terms and saves them through the card.
 */
export default function VenueBookingOffers({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ myVenues: BookingOffersVenue[] }>(MY_VENUES_OFFERS, {
    fetchPolicy: 'cache-and-network',
  });
  const venue = data?.myVenues.find((entry) => entry.id === venueId);

  if (venue) {
    return (
      <BookingOffersCard
        venue={venue}
        onSaved={async (message) => {
          notifySuccess(message);
          await refetch();
        }}
      />
    );
  }
  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  return (
    <Alert severity="error" data-testid="booking-offers-load-failed">
      {error ? parseApiError(error) : t('partners.venueSetup.loadFailed')}
    </Alert>
  );
}
