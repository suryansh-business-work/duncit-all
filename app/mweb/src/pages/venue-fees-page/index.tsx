import { useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { VenuePricingPartEditor } from '@duncit/availability-calendar';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import BookingOffersCard from './BookingOffersCard';
import { MY_VENUES_OFFERS, type FeesVenue } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';

/**
 * Fees & Minimum Spend, for a venue owner on their phone — the venue's one
 * pricing setup, one venue at a time: its booking offers and minimum spend (the
 * rules a host's offer must meet), then the cleaning and pet fees, deposit and
 * GST added to the price. Each part saves on its own. The same sections, rules
 * and copy as the Partners console and the native app.
 */
export default function VenueFeesPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ myVenues: FeesVenue[] }>(MY_VENUES_OFFERS, {
    fetchPolicy: 'cache-and-network',
  });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);

  return (
    <VenuePageFrame
      icon={<PaymentsRoundedIcon fontSize="small" />}
      title={t('mweb.studioOptions.venueFees')}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.venueSettingsPage.noVenues')}
    >
      {venue && (
        <Stack spacing={2} data-testid="venue-fees-page" key={venue.id}>
          <BookingOffersCard venue={venue} onSaved={refetch} />
          <Card sx={{ overflow: 'visible' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <VenuePricingPartEditor venueId={venue.id} part="fees" />
            </CardContent>
          </Card>
        </Stack>
      )}
    </VenuePageFrame>
  );
}
