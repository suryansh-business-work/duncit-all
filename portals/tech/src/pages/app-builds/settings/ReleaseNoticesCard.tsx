import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { SLACK_CHANNELS, SLACK_CONFIGURED, type SlackChannel } from '../../../lib/slack-queries';
import { STORE_RELEASE_SETTINGS, UPDATE_STORE_RELEASE_SETTINGS, type StoreReleaseSettings } from '../releases/queries';
import { ReleaseNoticesForm, toSettingsInput, type ReleaseNoticesValues } from './release-notices';

/**
 * Where a rejection is announced: the Slack channel, the mail addresses, and
 * how often an open issue is raised again. Not gated on Slack — the mail
 * still goes out on an install with no bot, and the channel field simply has
 * no list to pick from.
 */
export default function ReleaseNoticesCard() {
  const { t } = useTranslation();
  const configured = useQuery<{ slackConfigured: boolean }>(SLACK_CONFIGURED, { fetchPolicy: 'cache-and-network' });
  const isConfigured = configured.data?.slackConfigured === true;
  const channelsQuery = useQuery<{ slackChannels: SlackChannel[] }>(SLACK_CHANNELS, { skip: !isConfigured });
  const settingsQuery = useQuery<{ storeReleaseSettings: StoreReleaseSettings }>(STORE_RELEASE_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, saving] = useMutation<any>(UPDATE_STORE_RELEASE_SETTINGS);

  const onSubmit = useCallback(
    async (values: ReleaseNoticesValues) => {
      try {
        await save({ variables: { input: toSettingsInput(values) } });
        notifySuccess(t('tech.appBuilds.saved'));
        await settingsQuery.refetch();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [save, settingsQuery, t]
  );

  const settings = settingsQuery.data?.storeReleaseSettings;

  return (
    <Card sx={{ maxWidth: 640, mt: 2 }} data-testid="release-notices-card">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <NotificationsActiveIcon fontSize="small" />
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t('tech.appBuilds.releaseNoticesTitle')}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.releaseNoticesHint')}
          </Typography>
          {!configured.loading && !isConfigured && <Alert severity="info">{t('tech.appBuilds.releaseNoticesNoSlack')}</Alert>}
          {settingsQuery.error && <Alert severity="error">{parseApiError(settingsQuery.error)}</Alert>}
          {!settings && !settingsQuery.error && <Skeleton height={220} />}
          {settings && (
            <ReleaseNoticesForm
              settings={settings}
              channels={channelsQuery.data?.slackChannels ?? []}
              busy={saving.loading}
              onSubmit={onSubmit}
            />
          )}
          {settings?.updated_at && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tech.storeListing.lastSaved', { vars: { by: settings.updated_by, when: formatDateTime(settings.updated_at) } })}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
