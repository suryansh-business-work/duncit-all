import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_APP_DOWNLOAD, type CrmAppDownloadData } from '../../api/appDownload.gql';
import AppBuildCard from './AppBuildCard';

const INSTALL_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

/**
 * CRM → Download CRM App: the newest Duncit CRM Android APK, built by CI on
 * every push and announced on Slack. Production first; a staging build is
 * offered beside it for testers, labelled as such.
 */
export default function DownloadAppPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<CrmAppDownloadData>(CRM_APP_DOWNLOAD, {
    fetchPolicy: 'cache-and-network',
  });
  const download = data?.crmAppDownload;

  return (
    <Stack spacing={2} sx={{ maxWidth: 880 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <AndroidIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {t('shell.nav.downloadCrmApp')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.downloadApp.intro')}
          </Typography>
        </Box>
      </Stack>

      {loading && !download && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label={t('crm.downloadApp.loading')} />
        </Box>
      )}

      {error && !download && (
        <Alert
          severity="error"
          action={
            <DuncitButton size="small" color="inherit" onClick={() => fireAndForget(refetch(), logs.portal.crm, 'DownloadAppPage', 'retry')}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('crm.downloadApp.loadFailed')}
        </Alert>
      )}

      {download && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ '& > *': { flex: 1 } }}>
          <AppBuildCard env="PRODUCTION" build={download.production} />
          {download.staging && <AppBuildCard env="STAGING" build={download.staging} />}
        </Stack>
      )}

      <Box component="section" aria-labelledby="crm-app-install">
        <Typography id="crm-app-install" component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {t('crm.downloadApp.installTitle')}
        </Typography>
        <Box component="ol" sx={{ pl: 3, m: 0 }}>
          {INSTALL_STEPS.map((step) => (
            <Typography component="li" variant="body2" key={step} sx={{ mb: 0.5 }}>
              {t(`crm.downloadApp.${step}`)}
            </Typography>
          ))}
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('crm.downloadApp.androidOnly')}
        </Alert>
      </Box>
    </Stack>
  );
}
