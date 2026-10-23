import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { VenueOfferInbox } from '@duncit/availability-calendar';
import PillChips from '../../components/club-admin/PillChips';
import { ALL_VENUES, MY_VENUES } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';

/**
 * Booking requests — hosts who want to run a pod at the owner's venue, each
 * with the price they offer — on the Workshop & Event Requests page's first
 * tab. The same inbox the Partners console shows (Accept / Counter / Reject);
 * a pod stays unlisted until the venue agrees.
 */
export default function VenueSlotRequestsPage() {
  const { t } = useTranslation();
  // null until the owner taps a chip: the page opens on the venue the Venue
  // Options page selected, and "All venues" stays one tap away.
  const [chosenId, setChosenId] = useState<string | null>(null);
  const venuesQuery = useQuery<{ myVenues: { id: string; venue_name?: string }[] }>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues = venuesQuery.data?.myVenues ?? [];
  const selected = useSelectedVenue(venues);
  const venueId = chosenId ?? selected.venueId ?? ALL_VENUES;
  const venueOptions = useMemo(
    () => [
      { value: ALL_VENUES, label: t('availability.offers.allVenues') },
      ...venues.map((venue) => ({ value: venue.id, label: venue.venue_name || t('mweb.venueManagePage.untitledVenue') })),
    ],
    [venues, t]
  );

  return (
    <Stack spacing={2.5} data-testid="venue-slot-requests-page">
      {venues.length > 1 && (
        <PillChips
          label={t('availability.offers.venueFilter')}
          options={venueOptions}
          value={venueId}
          onChange={(id) => {
            setChosenId(id);
            // A specific venue is remembered for every venue page; All is not
            // a venue, so it stays this page's own choice.
            if (id !== ALL_VENUES) selected.selectVenue(id);
          }}
        />
      )}
      {/* Wait for the venue list, or the inbox would read every venue's requests first and then the selected one's. */}
      {!(venuesQuery.loading && !venuesQuery.data) && <VenueOfferInbox venueId={venueId === ALL_VENUES ? null : venueId} />}
    </Stack>
  );
}
