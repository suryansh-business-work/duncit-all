import { useQuery } from '@apollo/client/react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { VenueOfferInbox } from '@duncit/availability-calendar';
import { useTranslation } from '@duncit/shell';
import { MY_VENUES } from '../register-venue-page/queries';
import { ALL_VENUES, useVenueFilter } from '../../components/venue/useSelectedVenue';

/** Hosts' booking offers for the owner's venues — one venue or all of them — answered with Accept, Counter or Reject. */
export default function BookingRequestsTab() {
  const { t } = useTranslation();
  const venuesQuery = useQuery<{ myVenues: { id: string; venue_name?: string | null }[] }>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues = venuesQuery.data?.myVenues ?? [];
  // Opens on the venue picked last on any venue page; "All venues" stays a choice.
  const filter = useVenueFilter(venues);

  return (
    <Stack spacing={2} data-testid="booking-requests-tab">
      {venues.length > 1 && (
        <TextField
          select
          size="small"
          label={t('availability.offers.venueFilter')}
          value={filter.value}
          onChange={(e) => filter.change(e.target.value)}
          sx={{ maxWidth: 320 }}
        >
          <MenuItem value={ALL_VENUES}>{t('availability.offers.allVenues')}</MenuItem>
          {venues.map((venue) => (
            <MenuItem key={venue.id} value={venue.id}>
              {venue.venue_name || t('mweb.venueManagePage.untitledVenue')}
            </MenuItem>
          ))}
        </TextField>
      )}
      <VenueOfferInbox venueId={filter.venueIdOrNull} />
    </Stack>
  );
}
