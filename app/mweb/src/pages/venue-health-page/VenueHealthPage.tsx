import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HealthMeter from '../../components/health/HealthMeter';
import HealthBreakdown from '../../components/health/HealthBreakdown';
import { MY_VENUE_HEALTH, type HealthScore } from '../../components/health/queries';

export default function VenueHealthPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myVenueHealth: HealthScore | null }>(MY_VENUE_HEALTH, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  return (
    <Stack spacing={2.25} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            {data?.myVenueHealth?.subject_label || 'Venue'}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
            Venue Health
          </Typography>
        </Box>
      </Stack>

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {data?.myVenueHealth && (
        <Stack spacing={2.5} alignItems="center">
          <HealthMeter
            score={data.myVenueHealth.total_score}
            band={data.myVenueHealth.band}
            label="Venue health"
          />
          <Box sx={{ width: '100%' }}>
            <HealthBreakdown score={data.myVenueHealth} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
