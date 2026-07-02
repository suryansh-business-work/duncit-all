import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { MY_VENUES } from '../register-venue-page/queries';
import { VENUE_OWNER_STATS, emptyVenueOwnerStats } from './queries';
import VenueStatCards from './VenueStatCards';

const ALL_VENUES = 'ALL';

export default function VenueDashboardPage() {
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const venuesQuery = useQuery(MY_VENUES, { fetchPolicy: 'cache-and-network' });
  const statsQuery = useQuery(VENUE_OWNER_STATS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    fetchPolicy: 'cache-and-network',
  });

  const venues = venuesQuery.data?.myVenues ?? [];
  const stats = statsQuery.data?.venueOwnerStats ?? emptyVenueOwnerStats;
  const selectedVenue = venues.find((venue: any) => venue.id === venueId);

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Card
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          color: '#fff',
          background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 800 }}>Partner tools · Venues</Typography>
            <Typography variant="h5" fontWeight={950}>Venue Dashboard</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Slot-based earnings potential, capacity and booking requests across your venues.
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            label="Venue"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            helperText="Pick one venue or view all together"
            sx={{
              minWidth: 240,
              '& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormHelperText-root': { color: '#fff' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
              '& .MuiSvgIcon-root': { color: '#fff' },
            }}
          >
            <MenuItem value={ALL_VENUES}>All venues</MenuItem>
            {venues.map((venue: any) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name || 'Untitled venue'}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {statsQuery.error && <Alert severity="error">{statsQuery.error.message}</Alert>}

      <VenueStatCards stats={stats} loading={statsQuery.loading && !statsQuery.data} />

      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
            Quick actions
          </Typography>
          <Button component={RouterLink} to="/register-venue" size="small" variant="outlined" startIcon={<StorefrontIcon />}>
            Venue Management
          </Button>
          <Button component={RouterLink} to="/venues/requests" size="small" variant="outlined" startIcon={<EventAvailableIcon />}>
            Slot Requests{stats.pending_requests > 0 ? ` (${stats.pending_requests})` : ''}
          </Button>
          {selectedVenue?.status === 'APPROVED' && (
            <Button
              component={RouterLink}
              to={`/venues/${selectedVenue.id}/availability`}
              size="small"
              variant="contained"
              startIcon={<CalendarMonthIcon />}
            >
              Availability Calendar
            </Button>
          )}
        </Stack>
      </Card>

      {!venuesQuery.loading && venues.length === 0 && (
        <Alert severity="info" action={<Button component={RouterLink} to="/register-venue/new" size="small">Register venue</Button>}>
          Register your first venue to start publishing bookable slots.
        </Alert>
      )}
    </Stack>
  );
}
