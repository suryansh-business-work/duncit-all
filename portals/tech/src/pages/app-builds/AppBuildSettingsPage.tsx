import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { notify, notifyError } from '@duncit/dialogs';
import { SLACK_CHANNELS, SLACK_CONFIGURED, type SlackChannel } from '../slack/queries';
import { AppBuildSettingsForm, CiCredentialsCard, type AppBuildSettingsValues } from './settings';
import { APP_BUILD_SETTINGS, UPDATE_APP_BUILD_SETTINGS, type AppBuildSettings } from './queries';

/**
 * Which Slack channels the CI build announcements post to. Stored on the SLACK
 * env entry (next to the bot token), so the Environment page shows them too.
 */
export default function AppBuildSettingsPage() {
  const { t } = useTranslation();
  const configured = useQuery<{ slackConfigured: boolean }>(SLACK_CONFIGURED, {
    fetchPolicy: 'cache-and-network',
  });
  const isConfigured = configured.data?.slackConfigured === true;
  const channelsQuery = useQuery<{ slackChannels: SlackChannel[] }>(SLACK_CHANNELS, {
    skip: !isConfigured,
  });
  // NOT gated on Slack: a build is recorded whether or not it can be announced,
  // so the CI credential below has to be reachable on a Slack-less install too.
  const settingsQuery = useQuery<{ appBuildSettings: AppBuildSettings }>(APP_BUILD_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, saving] = useMutation<any>(UPDATE_APP_BUILD_SETTINGS);

  const onSubmit = useCallback(
    (values: AppBuildSettingsValues) => {
      save({ variables: { input: values } })
        .then(() => {
          notify(t('tech.appBuilds.saved'), 'success');
          return settingsQuery.refetch();
        })
        .catch((err) => notifyError(err instanceof Error ? err.message : String(err)));
    },
    [save, settingsQuery, t]
  );

  const settings = settingsQuery.data?.appBuildSettings;
  const showForm = isConfigured && settings;

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          {t('tech.appBuilds.settingsTitle')}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('tech.appBuilds.settingsSubtitle')}
        </Typography>
      </Stack>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          {!configured.loading && !isConfigured && (
            <Alert severity="warning">{t('tech.appBuilds.slackNotConfigured')}</Alert>
          )}
          {isConfigured && !settings && <Skeleton height={140} />}
          {showForm && (
            <AppBuildSettingsForm
              settings={settings}
              channels={channelsQuery.data?.slackChannels ?? []}
              busy={saving.loading}
              onSubmit={onSubmit}
            />
          )}
        </CardContent>
      </Card>
      {settings && <CiCredentialsCard settings={settings} />}
    </Box>
  );
}
