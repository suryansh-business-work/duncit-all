import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HealthMeter from '../../components/health/HealthMeter';
import HealthBreakdown from '../../components/health/HealthBreakdown';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../../components/health/queries';

export default function AccountHealthPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myAccountHealth: HealthScore }>(MY_ACCOUNT_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });

  return (
    <Stack spacing={2.25} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Your account
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
            Account Health
          </Typography>
        </Box>
      </Stack>

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {data?.myAccountHealth && (
        <Stack spacing={2.5} alignItems="center">
          <HealthMeter
            score={data.myAccountHealth.total_score}
            band={data.myAccountHealth.band}
            label="Account Health"
          />
          <Box sx={{ width: '100%' }}>
            <HealthBreakdown score={data.myAccountHealth} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
