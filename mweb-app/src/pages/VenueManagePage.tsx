import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import HealthMeter from '../components/health/HealthMeter';
import { MY_VENUE_HEALTH, type HealthScore } from '../components/health/queries';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChairIcon from '@mui/icons-material/Chair';
import EditIcon from '@mui/icons-material/Edit';
import InsightsIcon from '@mui/icons-material/Insights';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UserVenuePanel from './profile-page/UserVenuePanel';
import { venueUrl } from '../utils/seoUrls';

const MY_VENUE_DETAILS = gql`
  query MyVenueDetails {
    myVenue {
      id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      country
      city
      state
      locality
      postal_code
      amenities
      tags
      status
      approved_at
    }
  }
`;

export default function VenueManagePage() {
  const navigate = useNavigate();
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
  const venueCount = venue ? 1 : 0;
  const capacity = typeof venue?.capacity === 'number' ? venue.capacity : 0;
  const isApproved = venue?.status === 'APPROVED';

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <StorefrontIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Venue Studio
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            List your space, run events, get discovered
          </Typography>
        </Box>
        <Button component={RouterLink} to="/register-venue" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 950 }}>
          New venue
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        {[{ label: 'Listed', value: venueCount, icon: <StorefrontIcon fontSize="small" /> }, { label: 'Capacity', value: capacity || '-', icon: <ChairIcon fontSize="small" /> }, { label: 'Status', value: venue?.status ?? 'New', icon: <InsightsIcon fontSize="small" /> }].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack direction="row" spacing={0.75} alignItems="center" color="primary.main">
                {item.icon}
                <Typography variant="caption" sx={{ fontWeight: 950 }} noWrap>{item.label}</Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }} noWrap>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {health && venue?.id && (
        <Card variant="outlined" sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <HealthMeter
                score={health.total_score}
                band={health.band}
                size={140}
                label="Venue Health"
                onClick={() => navigate(`/venues/${venue.id}/health`)}
                caption="Tap for details"
              />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  {health.band === 'GREEN' ? 'Venue is in great shape.' : health.band === 'YELLOW' ? 'A few things to polish.' : 'Needs attention.'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Base activity: {health.base_score}
                  {health.delta_sum !== 0 && (
                    <>
                      {' '}· Admin adjustment: {health.delta_sum > 0 ? `+${health.delta_sum}` : health.delta_sum}
                    </>
                  )}
                </Typography>
                {health.adjustments.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {health.adjustments.length} admin remark{health.adjustments.length === 1 ? '' : 's'} — tap the meter to read.
                  </Typography>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(255,79,115,0.10)' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
              Your application
            </Typography>
            <UserVenuePanel />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Your venues</Typography>
              <Typography variant="caption" color="text.secondary">{venueCount} listed</Typography>
            </Box>
            <Chip size="small" label={isApproved ? 'Live' : 'Draft'} color={isApproved ? 'success' : 'warning'} sx={{ fontWeight: 900 }} />
          </Stack>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : error ? (
            <Alert severity="error">{error.message}</Alert>
          ) : !venue ? (
            <Alert severity="info">
              You haven't registered a venue yet.
              <Box sx={{ mt: 1.5 }}>
                <Button
                  component={RouterLink}
                  to="/register-venue"
                  variant="contained"
                  size="small"
                >
                  Register a venue
                </Button>
              </Box>
            </Alert>
          ) : (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 3.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1.25}>
                <Box component="img" src={venue.cover_image_url || '/duncit-logo.svg'} alt={venue.venue_name} sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 2.5, bgcolor: 'action.hover', flex: '0 0 auto' }} />
                <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }} noWrap>
                    {venue.venue_name}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {[venue.venue_type, venue.locality, venue.city, venue.state].filter(Boolean).join(' - ') || '-'}
                </Typography>
                {venue.postal_code && (
                  <Typography variant="caption" color="text.secondary">
                    PIN: {venue.postal_code}
                  </Typography>
                )}
                {venue.tags?.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {venue.tags.map((tag: string) => <Chip key={tag} size="small" label={tag} variant="outlined" />)}
                  </Stack>
                )}
                {typeof venue.capacity === 'number' && (
                  <Typography variant="caption" color="text.secondary">
                    Capacity: {venue.capacity}
                  </Typography>
                )}
                {venue.description && (
                  <Typography variant="body2" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} color="text.primary">
                    {venue.description}
                  </Typography>
                )}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                <Button component={RouterLink} to="/register-venue" variant="outlined" size="small" startIcon={<EditIcon />} sx={{ flex: 1, borderRadius: 999, fontWeight: 900 }}>
                  Edit
                </Button>
                {venue?.status === 'APPROVED' && (
                  <Button component={RouterLink} to={venueUrl(venue.id)} variant="contained" size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ flex: 1, borderRadius: 999, fontWeight: 900 }}>
                    Public link
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
