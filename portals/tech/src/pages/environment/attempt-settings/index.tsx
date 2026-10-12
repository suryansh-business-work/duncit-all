import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { ENV_ATTEMPT_SETTINGS, UPDATE_ENV_ATTEMPT_SETTINGS, type EnvAttemptSettings } from '../queries';
import AttemptSettingsForm from './attempt-settings.form';
import { toAttemptSettingsInput, type AttemptSettingsValues } from './attempt-settings.types';

/**
 * Environment Variables → Settings. One section today: how many times an entry
 * of each category may be tested per window. A test is a real sign-in at the
 * vendor, and too many wrong ones lock the account — ShipRocket most of all.
 */
export default function EnvSettingsTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [saving, setSaving] = useState(false);
  const { data, loading, error } = useQuery<{ envAttemptSettings: EnvAttemptSettings }>(ENV_ATTEMPT_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<{ updateEnvAttemptSettings: EnvAttemptSettings }>(UPDATE_ENV_ATTEMPT_SETTINGS, {
    refetchQueries: [ENV_ATTEMPT_SETTINGS],
  });
  const settings = data?.envAttemptSettings;

  const submit = async (values: AttemptSettingsValues) => {
    setSaving(true);
    try {
      await save({ variables: { input: toAttemptSettingsInput(values) } });
      notifySuccess(t('shell.common.saved'));
    } catch (err) {
      notifyError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2} component="section" aria-labelledby="env-attempt-settings-title" data-testid="env-settings-tab">
      <Stack>
        <Typography id="env-attempt-settings-title" variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {t('tech.environment.attemptsTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.environment.attemptsSubtitle')}
        </Typography>
      </Stack>
      <Alert severity="info">{t('tech.environment.attemptsInfo')}</Alert>
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {settings && (
          <>
            <Card>
              <CardContent>
                <AttemptSettingsForm settings={settings} saving={saving} onSubmit={submit} />
              </CardContent>
            </Card>
            {settings.updated_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('tech.environment.attemptsUpdated', { vars: { at: formatDateTime(settings.updated_at) } })}
              </Typography>
            )}
          </>
        )}
      </QueryGuard>
    </Stack>
  );
}
