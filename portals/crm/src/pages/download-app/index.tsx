import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_APP_DOWNLOAD, type CrmAppDownloadData } from '../../api/appDownload.gql';
import PlatformSection from './PlatformSection';

/**
 * CRM → Download CRM App: the newest Duncit CRM Android build (APK + AAB) and
 * iPhone build (IPA), built by CI on every push and announced on Slack.
 * Production first; a staging build is offered beside it for testers,
 * labelled as such.
 */
export default function DownloadAppPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<CrmAppDownloadData>(CRM_APP_DOWNLOAD, {
    fetchPolicy: 'cache-and-network',
  });
  const download = data?.crmAppDownload;

  return (
    <Stack spacing={3} sx={{ maxWidth: 880 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <InstallMobileIcon color="primary" />
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
        <>
          <PlatformSection
            id="crm-app-android"
            icon={<AndroidIcon color="primary" />}
            title={t('crm.downloadApp.android')}
            production={download.production}
            staging={download.staging}
            installTitle={t('crm.downloadApp.installTitle')}
            steps={[
              t('crm.downloadApp.step1'),
              t('crm.downloadApp.step2'),
              t('crm.downloadApp.step3'),
              t('crm.downloadApp.step4'),
            ]}
          />
          <PlatformSection
            id="crm-app-ios"
            icon={<AppleIcon color="primary" />}
            title={t('crm.downloadApp.ios')}
            production={download.ios_production}
            staging={download.ios_staging}
            installTitle={t('crm.downloadApp.iosInstallTitle')}
            steps={[t('crm.downloadApp.iosStep1'), t('crm.downloadApp.iosStep2'), t('crm.downloadApp.step3')]}
            note={t('crm.downloadApp.androidOnly')}
          />
        </>
      )}
    </Stack>
  );
}
