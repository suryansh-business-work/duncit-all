import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import HealthMeter from '../../components/health/HealthMeter';
import HealthBreakdown from '../../components/health/HealthBreakdown';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../../components/health/queries';
import { useTranslation } from '../../i18n/useTranslation';

export default function AccountHealthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myAccountHealth: HealthScore }>(MY_ACCOUNT_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });

  return (
    <Stack spacing={2.25} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitIconButton size="small" onClick={() => navigate(-1)} aria-label={t('mweb.common.back')} sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </DuncitIconButton>
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Your account
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Account Health
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

      {data?.myAccountHealth && (
        <Stack spacing={2.5} sx={{
          alignItems: "center"
        }}>
          <HealthMeter
            score={data.myAccountHealth.total_score}
            band={data.myAccountHealth.band}
            label={t('mweb.common.accountHealth')}
          />
          <Box sx={{ width: '100%' }}>
            <HealthBreakdown score={data.myAccountHealth} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
