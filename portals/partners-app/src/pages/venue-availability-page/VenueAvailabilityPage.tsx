import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { CircularProgress, Stack } from '@mui/material';
import { VenueAvailabilityEditor, type EditorVenue } from '@duncit/availability-calendar';
import AvailabilityBlocked from './AvailabilityBlocked';
import AvailabilityHeader from './AvailabilityHeader';
import { MY_VENUES } from '../register-venue-page/queries';
import VenuePicker from '../../components/venue/VenuePicker';
import { useSelectedVenue } from '../../components/venue/useSelectedVenue';
import { useTranslation } from '@duncit/shell';

/**
 * The venue owner's availability page: find the venue among mine, refuse one
 * that is not mine or not yet approved, and hand the rest to the shared
 * editor — the same component mWeb mounts (rule 40).
 *
 * `/venues/:venueId/availability` opens the venue the URL names; the Venue
 * Options entry (`/venues/availability`) opens the SELECTED venue, with the
 * venue picker on top to switch it.
 */
export default function VenueAvailabilityPage() {
  const { t } = useTranslation();
  const { venueId: routeVenueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();

  const { data: venuesData, refetch } = useQuery<{ myVenues: EditorVenue[] }>(MY_VENUES, {
    fetchPolicy: 'cache-first',
  });
  const venues = venuesData?.myVenues ?? [];
  const selected = useSelectedVenue(venues);
  const venueId = routeVenueId ?? selected.venueId;
  const venue = venues.find((v) => v.id === venueId);
  const picker = routeVenueId || venues.length === 0 ? null : (
    <VenuePicker venues={venues} value={selected.venueId} onChange={selected.selectVenue} />
  );

  if (!venuesData) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  if (!venue) {
    const noVenues = !routeVenueId && venues.length === 0;
    return (
      <AvailabilityBlocked
        picker={picker}
        severity="error"
        message={
          noVenues ? t('mweb.studioOptions.noVenuesYet') : t('partners.venueAvailabilityPage.venueNotFoundOrItIsn')
        }
      />
    );
  }

  if (venue.status !== 'APPROVED') {
    return (
      <AvailabilityBlocked
        picker={picker}
        severity="warning"
        message={t('partners.venueAvailabilityPage.approvalRequired', {
          vars: { status: venue.status },
        })}
      />
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <AvailabilityHeader venueName={venue.venue_name ?? undefined} onBack={() => navigate('/register-venue')} />
      {picker}
      <VenueAvailabilityEditor
        key={venue.id}
        venue={venue}
        onVenueChanged={async () => {
          await refetch();
        }}
      />
    </Stack>
  );
}
