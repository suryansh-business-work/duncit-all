import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import RateLimitSettingsForm from './rate-limit-settings.form';
import type { RateLimitSettingsData } from './rate-limit-settings.types';
import {
  OPTIONS,
  RESET_COUNTERS,
  SETTINGS,
  UPDATE_SETTINGS,
  type RateLimitOptionsData,
} from '../queries';

/**
 * The platform-wide switches, plus the one destructive action this section has.
 *
 * "Reset counters" is here rather than on the rules table because it is not
 * about one rule: it forgets every live window and every cool-off, which is the
 * way out when a limit was tightened too far and somebody real is locked out.
 */
export default function RateLimitSettingsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{
    rateLimitSettings: RateLimitSettingsData;
  }>(SETTINGS, { fetchPolicy: 'cache-and-network' });
  const { data: optionsData } = useQuery<{ rateLimitOptions: RateLimitOptionsData }>(OPTIONS);
  const [save] = useMutation(UPDATE_SETTINGS);
  const [resetCounters] = useMutation(RESET_COUNTERS);

  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const settings = data?.rateLimitSettings;
  const options = optionsData?.rateLimitOptions;

  const submit = async (input: Record<string, unknown>) => {
    setSaving(true);
    setOpError(null);
    try {
      await save({ variables: { input } });
      setToast(t('shell.common.saved'));
      await refetch();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: t('tech.rateLimit.settings.resetCounters'),
      message: t('tech.rateLimit.settings.resetConfirm'),
      destructive: true,
      confirmLabel: t('tech.rateLimit.settings.resetCounters'),
    });
    if (!ok) return;
    try {
      await resetCounters();
      setToast(t('tech.rateLimit.settings.countersReset'));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('tech.rateLimit.settings.title')}
        subtitle={t('tech.rateLimit.settings.subtitle')}
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {settings && options && (
          <>
            {!settings.enabled && (
              <Alert severity="warning">{t('tech.rateLimit.settings.offWarning')}</Alert>
            )}
            {settings.store === 'MEMORY' && (
              <Alert severity="info">{t('tech.rateLimit.stats.memoryWarning')}</Alert>
            )}
            <Card>
              <CardContent>
                <RateLimitSettingsForm
                  settings={settings}
                  options={options}
                  saving={saving}
                  opError={opError}
                  onSubmit={submit}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2">
                    {t('tech.rateLimit.settings.resetCounters')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('tech.rateLimit.settings.resetHint')}
                  </Typography>
                  <Button color="error" startIcon={<RestartAltIcon />} onClick={reset}>
                    {t('tech.rateLimit.settings.resetCounters')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            {settings.updated_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('tech.rateLimit.settings.lastUpdated', {
                  vars: { at: formatDateTime(settings.updated_at) },
                })}
              </Typography>
            )}
          </>
        )}
      </QueryGuard>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
