import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { notify, notifyError } from '@duncit/dialogs';
import {
  E2E_RUN_SETTINGS,
  E2E_SUITE_CATALOGUE,
  UPDATE_E2E_RUN_SETTINGS,
  type E2eRunSettings,
  type E2eSuite,
} from '../queries';
import E2eSettingsForm from './e2e-settings.form';
import { toSettingsInput, type E2eSettingsValues } from './e2e-settings.types';

/** `2026-09-07T21:30:00.000Z` as something an operator reads at a glance. */
const whenLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString() : '';

/**
 * The nightly schedule and the identity the suite runs as.
 *
 * The schedule lives here rather than in the workflow's own cron because a cron
 * baked into a YAML file cannot be changed without a commit — and because two
 * schedules would mean two runs a night. This page is the only thing that
 * decides when the suite sweeps.
 */
export default function E2eSettingsPage() {
  const { t } = useTranslation();
  const settingsQuery = useQuery<{ e2eRunSettings: E2eRunSettings }>(E2E_RUN_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const catalogue = useQuery<{ e2eSuiteCatalogue: E2eSuite[] }>(E2E_SUITE_CATALOGUE);
  const [save, saving] = useMutation<any>(UPDATE_E2E_RUN_SETTINGS);

  const settings = settingsQuery.data?.e2eRunSettings;
  const suites = catalogue.data?.e2eSuiteCatalogue ?? [];

  const onSubmit = useCallback(
    (values: E2eSettingsValues) => {
      save({ variables: { input: toSettingsInput(values, suites.length) } })
        .then(() => {
          notify(t('tech.e2e.saved'), 'success');
          return settingsQuery.refetch();
        })
        .catch((err) => notifyError(err instanceof Error ? err.message : String(err)));
    },
    [save, settingsQuery, suites.length, t]
  );

  const nextRun = whenLabel(settings?.next_run_at ?? null);
  const lastReport = whenLabel(settings?.last_reported_at ?? null);

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('tech.e2e.settingsTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('tech.e2e.settingsSubtitle')}
        </Typography>
      </Stack>

      {settings && (
        <Alert severity={settings.enabled ? 'info' : 'warning'} sx={{ mb: 2, maxWidth: 760 }}>
          {settings.enabled && nextRun
            ? t('tech.e2e.nextRunAt', { vars: { when: nextRun } })
            : t('tech.e2e.scheduleOff')}
        </Alert>
      )}

      <Card sx={{ maxWidth: 760 }}>
        <CardContent>
          {(!settings || suites.length === 0) && <Skeleton height={220} />}
          {settings && suites.length > 0 && (
            <E2eSettingsForm
              settings={settings}
              suites={suites}
              busy={saving.loading}
              onSubmit={onSubmit}
            />
          )}
        </CardContent>
      </Card>

      {/* Whether CI can reach us is not knowable from here — the credential
          lives in GitHub. The last report is the only honest evidence, so this
          says what was actually seen rather than claiming a status. */}
      <Card sx={{ maxWidth: 760, mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {t('tech.e2e.ciHeading')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {lastReport
              ? t('tech.e2e.ciLastReport', {
                  vars: { when: lastReport, who: settings?.last_reported_by ?? '' },
                })
              : t('tech.e2e.ciNeverReported')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            {t('tech.e2e.ciTokenHint')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
