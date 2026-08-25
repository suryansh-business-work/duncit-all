import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HealthMeter from '../../components/health/HealthMeter';
import HealthBreakdown from '../../components/health/HealthBreakdown';
import { MY_VENUE_HEALTH, type HealthScore } from '../../components/health/queries';
import { useTranslation } from '../../i18n/useTranslation';

export default function VenueHealthPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myVenueHealth: HealthScore | null }>(MY_VENUE_HEALTH, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  return (
    <Stack spacing={2.25} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label={t('mweb.common.back')} sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            {data?.myVenueHealth?.subject_label || 'Venue'}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Venue Health
          </Typography>
        </Box>
      </Stack>

      {loading && !data && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {data?.myVenueHealth && (
        <Stack spacing={2.5} sx={{
          alignItems: "center"
        }}>
          <HealthMeter
            score={data.myVenueHealth.total_score}
            band={data.myVenueHealth.band}
            label={t('mweb.venueHealth.venueHealth')}
          />
          <Box sx={{ width: '100%' }}>
            <HealthBreakdown score={data.myVenueHealth} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
