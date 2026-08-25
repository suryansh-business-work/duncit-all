import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import SimpleBarChart, { buildMonthlyCounts } from '../components/SimpleBarChart';
import { MY_VENUE_HEALTH, type HealthScore } from '../components/health/queries';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChairIcon from '@mui/icons-material/Chair';
import InsightsIcon from '@mui/icons-material/Insights';
import StorefrontIcon from '@mui/icons-material/Storefront';
import UserVenuePanel from './profile-page/UserVenuePanel';
import VenueEarningsLinkCard from './venue-earnings-page/VenueEarningsLinkCard';
import VenueHealthCard from './venue-manage-page/VenueHealthCard';
import VenueListBody from './venue-manage-page/VenueListBody';
import VenuePodsSection from './venue-manage-page/VenuePodsSection';
import { MY_VENUE_DETAILS, PODS_AT_VENUE } from './venue-manage-page/queries';
import { useTranslation } from '../i18n/useTranslation';

export default function VenueManagePage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_VENUE_DETAILS, {
    fetchPolicy: 'cache-and-network',
  });
  const venue = data?.myVenue;
  const { data: healthData } = useQuery<{ myVenueHealth: HealthScore | null }>(MY_VENUE_HEALTH, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const health = healthData?.myVenueHealth ?? null;
  const podsQ = useQuery(PODS_AT_VENUE, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const venuePods: any[] = podsQ.data?.pods ?? [];
  const venueCount = venue ? 1 : 0;
  const capacity = typeof venue?.capacity === 'number' ? venue.capacity : 0;
  const isApproved = venue?.status === 'APPROVED';

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <StorefrontIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Venue Studio
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            List your space, run events, get discovered
          </Typography>
        </Box>
        <Button component={RouterLink} to="/register-venue" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
          New venue
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        {[{ label: t('mweb.venueManagePage.listed'), value: venueCount, icon: <StorefrontIcon fontSize="small" /> }, { label: t('mweb.common.capacity'), value: capacity || '-', icon: <ChairIcon fontSize="small" /> }, { label: t('mweb.venueManagePage.status'), value: venue?.status ?? 'New', icon: <InsightsIcon fontSize="small" /> }].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: '16px' }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  alignItems: "center",
                  color: "primary.main"
                }}>
                {item.icon}
                <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{item.label}</Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 700 }} noWrap>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <VenueEarningsLinkCard />

      {venue?.id && <VenuePodsSection venueId={venue.id} />}

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Pods at your venue
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Bookings over the last 2 and next 3 months
          </Typography>
          <SimpleBarChart data={buildMonthlyCounts(venuePods.map((p) => p.pod_date_time))} />
        </CardContent>
      </Card>

      {health && venue?.id && <VenueHealthCard health={health} venueId={venue.id} />}

      <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.10)' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Your application
            </Typography>
            <UserVenuePanel />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              mb: 1.5
            }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('mweb.venueManagePage.yourVenues')}</Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{venueCount} listed</Typography>
            </Box>
            <Chip size="small" label={isApproved ? 'Live' : 'Draft'} color={isApproved ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
          </Stack>
          <VenueListBody showSpinner={loading && !data} error={error} venue={venue} />
        </CardContent>
      </Card>
    </Stack>
  );
}
