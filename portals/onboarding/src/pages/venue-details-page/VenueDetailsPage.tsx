import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { VENUE_DETAILS, type AdminVenueDetails } from './queries';
import VenueOverviewCard from './VenueOverviewCard';
import VenueHealthCard from './VenueHealthCard';
import VenueSlotAvailabilityTab from './VenueSlotAvailabilityTab';

const TABS = ['Overview', 'Account Health', 'Slot Availability'] as const;

export default function VenueDetailsPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { data, loading, error } = useQuery<{ venue: AdminVenueDetails | null }>(VENUE_DETAILS, {
    variables: { venue_doc_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!data?.venue) return <Alert severity="warning">Venue not found.</Alert>;

  const venue = data.venue;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/venues')} aria-label="Back to venues" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Venue
          </Typography>
          <Typography variant="h5" fontWeight={950} sx={{ lineHeight: 1.1 }}>
            {venue.venue_name || 'Untitled venue'}
          </Typography>
        </Box>
      </Stack>

      <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {tab === 0 && <VenueOverviewCard venue={venue} />}

      {tab === 1 && (
        <Stack>
          <Typography variant="h6" fontWeight={900}>
            Account Health
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
            Default score is 100. Use the Adjust action to decrease or increase it with a remark —
            remarks are visible to the venue owner when they tap the meter.
          </Typography>
          <VenueHealthCard venueId={venue.id} />
        </Stack>
      )}

      {tab === 2 && <VenueSlotAvailabilityTab venueId={venue.id} />}
    </Stack>
  );
}
