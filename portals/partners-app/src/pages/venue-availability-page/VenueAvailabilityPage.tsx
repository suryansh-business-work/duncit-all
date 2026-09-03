import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { CircularProgress, Stack } from '@mui/material';
import { VenueAvailabilityEditor, type EditorVenue } from '@duncit/availability-calendar';
import AvailabilityBlocked from './AvailabilityBlocked';
import AvailabilityHeader from './AvailabilityHeader';
import { MY_VENUES } from '../register-venue-page/queries';
import { useTranslation } from '@duncit/shell';

/**
 * The venue owner's availability page: find the venue among mine, refuse one
 * that is not mine or not yet approved, and hand the rest to the shared
 * editor — the same component mWeb mounts (rule 40).
 */
export default function VenueAvailabilityPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();

  const { data: venuesData, refetch } = useQuery<{ myVenues: EditorVenue[] }>(MY_VENUES, {
    fetchPolicy: 'cache-first',
  });
  const venue = venuesData?.myVenues.find((v) => v.id === venueId);

  if (!venuesData) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (!venue) {
    return (
      <AvailabilityBlocked
        severity="error"
        message={t('partners.venueAvailabilityPage.venueNotFoundOrItIsn')}
      />
    );
  }

  if (venue.status !== 'APPROVED') {
    return (
      <AvailabilityBlocked
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
      <VenueAvailabilityEditor
        venue={venue}
        onVenueChanged={async () => {
          await refetch();
        }}
      />
    </Stack>
  );
}
