import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import StressSettingsForm from './stress-settings.form';
import type { StressSettingsValues } from './stress-settings.types';
import { formatDateTime } from '../../server/format';
import { STRESS_SETTINGS, UPDATE_STRESS_SETTINGS, type StressSettings } from '../queries';

/**
 * Tech > Stress Testing > Settings — the ceilings no run may exceed and the
 * guardrails that stop a run on their own. Both are enforced on the server;
 * this page is where they are chosen.
 */
export default function StressSettingsPage() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const { data, loading, error } = useQuery<{ stressSettings: StressSettings }>(STRESS_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<{ updateStressSettings: StressSettings }>(UPDATE_STRESS_SETTINGS, {
    refetchQueries: [STRESS_SETTINGS],
  });
  const settings = data?.stressSettings;

  const submit = async (input: StressSettingsValues) => {
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
    <Stack spacing={3}>
      <PageHeader title={t('tech.stress.settingsTitle')} subtitle={t('tech.stress.settingsSubtitle')} />
      <Alert severity="info">{t('tech.stress.settingsSafety')}</Alert>
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {settings && (
          <>
            <Card>
              <CardContent>
                <StressSettingsForm settings={settings} saving={saving} onSubmit={submit} />
              </CardContent>
            </Card>
            {settings.updated_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('tech.stress.lastUpdated', { vars: { at: formatDateTime(settings.updated_at) } })}
              </Typography>
            )}
          </>
        )}
      </QueryGuard>
    </Stack>
  );
}
