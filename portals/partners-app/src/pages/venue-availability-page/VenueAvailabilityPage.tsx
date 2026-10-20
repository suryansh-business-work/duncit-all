import { useQuery } from '@apollo/client/react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { CircularProgress, Stack } from '@mui/material';
import { VenuePricingModule, type EditorVenue } from '@duncit/availability-calendar';
import AvailabilityBlocked from './AvailabilityBlocked';
import AvailabilityHeader from './AvailabilityHeader';
import { MY_VENUES } from '../register-venue-page/queries';
import VenuePicker from '../../components/venue/VenuePicker';
import { useSelectedVenue } from '../../components/venue/useSelectedVenue';
import { useTranslation } from '@duncit/shell';

/** `/venues/:venueId/availability` (old links, emails) → the same venue's pricing page. */
export function VenueAvailabilityRedirect() {
  const { venueId } = useParams<{ venueId: string }>();
  return <Navigate to={venueId ? `/venues/${venueId}/pricing` : '/venues/pricing'} replace />;
}

/**
 * The venue owner's Venue Pricing Module page: find the venue among mine,
 * refuse one that is not mine or not yet approved, and hand the rest to the
 * shared module — the same component mWeb mounts (rule 40).
 *
 * `/venues/:venueId/pricing` opens the venue the URL names; the Venue
 * Options entry (`/venues/pricing`) opens the SELECTED venue, with the
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
      <VenuePricingModule
        key={venue.id}
        venue={venue}
        onVenueChanged={async () => {
          await refetch();
        }}
      />
    </Stack>
  );
}
