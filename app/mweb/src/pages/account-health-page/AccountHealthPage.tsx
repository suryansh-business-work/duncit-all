import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
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
    <Stack spacing={3} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitIconButton
          onClick={() => navigate(-1)}
          aria-label={t('mweb.common.back')}
          sx={{ width: 40, height: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
        >
          <ArrowBackIcon fontSize="small" />
        </DuncitIconButton>
        <Typography component="h1" sx={{ fontSize: 17, fontWeight: 600 }}>
          Account Health
        </Typography>
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
        <Stack spacing={3} sx={{
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
