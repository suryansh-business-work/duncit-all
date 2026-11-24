import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import {
  CRM_APP_BUILD_SETTINGS,
  UPDATE_CRM_APP_BUILD_SETTINGS,
  type CrmAppBuildSettings,
} from '../../api/appDownload.gql';
import { CrmAppChannelsForm, toCrmAppChannelsForm, type CrmAppChannelsValues } from '../../forms/crm-app-channels';

type SettingsData = { crmAppBuildSettings: CrmAppBuildSettings };

/**
 * CRM → CRM Mobile App → Settings: which Slack channel each new Duncit CRM
 * build is published to, production and staging apart. The same two settings
 * Tech → App Builds → Settings shows, so the screens never disagree.
 */
export default function CrmAppSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<SettingsData>(CRM_APP_BUILD_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, saving] = useMutation<{ updateCrmAppBuildSettings: CrmAppBuildSettings }>(UPDATE_CRM_APP_BUILD_SETTINGS, {
    refetchQueries: [{ query: CRM_APP_BUILD_SETTINGS }],
  });
  const settings = data?.crmAppBuildSettings;
  const initial = useMemo(() => (settings ? toCrmAppChannelsForm(settings) : null), [settings]);

  const onSubmit = async (values: CrmAppChannelsValues) => {
    try {
      await save({ variables: { input: values } });
      notifySuccess(t('crm.downloadApp.settings.saved'));
    } catch (err) {
      // notifyError takes a string — an Error object would white-screen the page.
      notifyError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <SettingsIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {t('crm.downloadApp.settings.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.downloadApp.settings.intro')}
          </Typography>
        </Box>
      </Stack>

      {loading && !settings && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label={t('crm.downloadApp.loading')} />
        </Box>
      )}

      {error && !settings && (
        <Alert
          severity="error"
          action={
            <DuncitButton size="small" color="inherit" onClick={() => fireAndForget(refetch(), logs.portal.crm, 'CrmAppSettingsPage', 'retry')}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('crm.downloadApp.settings.loadFailed')}
        </Alert>
      )}

      {settings && !settings.slack_configured && <Alert severity="info">{t('crm.downloadApp.settings.slackNotConnected')}</Alert>}
      {settings?.channels_error && (
        <Alert severity="warning">{t('crm.downloadApp.settings.channelsFailed', { vars: { reason: settings.channels_error } })}</Alert>
      )}

      {settings?.slack_configured && initial && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <CrmAppChannelsForm initial={initial} channels={settings.channels} saving={saving.loading} onSubmit={onSubmit} />
        </Paper>
      )}
    </Stack>
  );
}
