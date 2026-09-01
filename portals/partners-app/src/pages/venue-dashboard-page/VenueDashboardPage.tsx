import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { MY_VENUES } from '../register-venue-page/queries';
import { VENUE_OWNER_STATS, emptyVenueOwnerStats } from './queries';
import VenueStatCards from './VenueStatCards';
import { useTranslation } from '@duncit/shell';

const ALL_VENUES = 'ALL';

/** Same banner as the host console — page identity, and the venue picker that
 *  every widget below is scoped by. */
const HERO_SX = {
  p: { xs: 2, md: 3 },
  borderRadius: 3,
  color: '#fff',
  background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
} as const;

const PICKER_SX = {
  minWidth: 240,
  '& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormHelperText-root': { color: '#fff' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
  '& .MuiSvgIcon-root': { color: '#fff' },
} as const;

export default function VenueDashboardPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const venuesQuery = useQuery<any>(MY_VENUES, { fetchPolicy: 'cache-and-network' });
  const statsQuery = useQuery<any>(VENUE_OWNER_STATS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    fetchPolicy: 'cache-and-network',
  });

  const venues = venuesQuery.data?.myVenues ?? [];
  const stats = statsQuery.data?.venueOwnerStats ?? emptyVenueOwnerStats;
  const selectedVenue = venues.find((venue: any) => venue.id === venueId);

  const widgets: DashboardWidget[] = [
    {
      id: 'stat-cards',
      bare: true,
      // Six cards wrap to two rows below lg — a fixed h cuts them off there.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <VenueStatCards stats={stats} loading={statsQuery.loading && !statsQuery.data} />,
    },
    {
      id: 'quick-actions',
      title: t('partners.common.quickActions'),
      defaultLayout: { x: 0, y: 2, w: 12, h: 2 },
      minH: 2,
      content: (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          alignItems: { sm: 'center' }
        }}>
          <DuncitButton component={RouterLink} to="/register-venue" size="small" variant="outlined" startIcon={<StorefrontIcon />}>
            Venue Management
          </DuncitButton>
          <DuncitButton component={RouterLink} to="/venues/requests" size="small" variant="outlined" startIcon={<EventAvailableIcon />}>
            Slot Requests{stats.pending_requests > 0 ? ` (${stats.pending_requests})` : ''}
          </DuncitButton>
          {selectedVenue?.status === 'APPROVED' && (
            <DuncitButton
              component={RouterLink}
              to={`/venues/${selectedVenue.id}/availability`}
              size="small"
              variant="contained"
              startIcon={<CalendarMonthIcon />}
            >
              Availability Calendar
            </DuncitButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="partners.venue"
      header={
        <Stack spacing={2.5}>
          <Card sx={HERO_SX}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
              alignItems: { md: 'center' }
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 800 }}>{t('partners.common.partnerToolsVenues')}</Typography>
                <Typography variant="h5" sx={{
                  fontWeight: 950
                }}>{t('partners.venueDashboardPage.venueDashboard')}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Slot-based earnings potential, capacity and booking requests across your venues.
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label={t('partners.common.venue')}
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                helperText={t('partners.venueDashboardPage.pickOneVenueOrViewAll')}
                sx={PICKER_SX}
              >
                <MenuItem value={ALL_VENUES}>{t('partners.common.allVenues')}</MenuItem>
                {venues.map((venue: any) => (
                  <MenuItem key={venue.id} value={venue.id}>
                    {venue.venue_name || 'Untitled venue'}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>

          {statsQuery.error && <Alert severity="error">{statsQuery.error.message}</Alert>}

          {!venuesQuery.loading && venues.length === 0 && (
            <Alert severity="info" action={<DuncitButton component={RouterLink} to="/register-venue/new" size="small">{t('partners.venueDashboardPage.registerVenue')}</DuncitButton>}>
              Register your first venue to start publishing bookable slots.
            </Alert>
          )}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
