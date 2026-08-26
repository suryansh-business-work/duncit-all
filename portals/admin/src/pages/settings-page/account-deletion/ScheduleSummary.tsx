import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { CronSettings } from './queries';

interface Props {
  settings: CronSettings | undefined;
  /** Requests already past their date, waiting for the next sweep. */
  dueCount: number;
}

/**
 * What the sweep will actually do next, in plain words.
 *
 * The fields above say what was configured; this says what that CONFIGURATION
 * MEANS right now — when it next fires, when it last did, and how many accounts
 * are already waiting. The three together are what makes a silent job
 * trustworthy: a "next run" that never moves and a backlog that only grows are
 * the two symptoms of a scheduler that has quietly stopped, and neither is
 * visible from the form fields alone.
 */
export default function ScheduleSummary({ settings, dueCount }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!settings) return null;

  const dueSeverity = dueCount > 0 ? 'warning' : 'info';

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          size="small"
          label={
            settings.next_run_at
              ? t('admin.accountDeletion.nextRun', {
                  vars: { when: formatDateTime(settings.next_run_at) },
                })
              : t('admin.accountDeletion.nextRunOff')
          }
          color={settings.next_run_at ? 'primary' : 'default'}
          variant="outlined"
        />
        <Chip
          size="small"
          variant="outlined"
          label={
            settings.last_run_at
              ? t('admin.accountDeletion.lastRun', {
                  vars: { when: formatDateTime(settings.last_run_at) },
                })
              : t('admin.accountDeletion.lastRunNever')
          }
        />
      </Stack>

      <Alert severity={dueSeverity} data-testid="deletion-due-count">
        {dueCount > 0
          ? t('admin.accountDeletion.dueNow', { vars: { count: dueCount } })
          : t('admin.accountDeletion.dueNone')}
      </Alert>

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('admin.accountDeletion.timezoneHint')}
      </Typography>
    </Stack>
  );
}
