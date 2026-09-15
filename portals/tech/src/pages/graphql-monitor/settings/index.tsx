import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '../../server/format';
import { GraphqlMonitorSettingsForm, type GraphqlMonitorSettingsValues } from './graphql-monitor-settings';
import { GRAPHQL_MONITOR_SETTINGS, UPDATE_GRAPHQL_MONITOR_SETTINGS, type MonitorSettings } from '../queries';

/**
 * Tech > GraphQL Monitor > Settings — whether requests are measured, how many
 * have their resolvers timed, what counts as slow and how long it is all kept.
 * Enforced on the server; a save applies to the next request.
 */
export default function GraphqlMonitorSettingsPage() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const { data, loading, error } = useQuery<{ graphqlMonitorSettings: MonitorSettings }>(GRAPHQL_MONITOR_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<{ updateGraphqlMonitorSettings: MonitorSettings }>(UPDATE_GRAPHQL_MONITOR_SETTINGS, {
    refetchQueries: [GRAPHQL_MONITOR_SETTINGS],
  });
  const settings = data?.graphqlMonitorSettings;

  const submit = async (input: GraphqlMonitorSettingsValues) => {
    setSaving(true);
    try {
      await save({ variables: { input } });
      notifySuccess(t('shell.common.saved'));
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} data-testid="graphql-monitor-settings-page">
      <PageHeader title={t('tech.graphqlMonitor.settingsTitle')} subtitle={t('tech.graphqlMonitor.settingsSubtitle')} />
      <Alert severity="info">{t('tech.graphqlMonitor.settingsPrivacy')}</Alert>
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {settings && (
          <>
            <Card>
              <CardContent>
                <GraphqlMonitorSettingsForm settings={settings} saving={saving} onSubmit={submit} />
              </CardContent>
            </Card>
            {settings.updated_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('tech.graphqlMonitor.lastUpdated', { vars: { at: formatDateTime(settings.updated_at) } })}
              </Typography>
            )}
          </>
        )}
      </QueryGuard>
    </Stack>
  );
}
