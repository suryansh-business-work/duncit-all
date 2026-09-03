import { Alert, LinearProgress, Stack, Typography, type AlertColor } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { AutoTranslateJobRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Alert tone per finished status. A RUNNING job returns before this is read. */
const SEVERITY: Record<string, AlertColor> = {
  SUCCEEDED: 'success',
  FAILED: 'error',
  CANCELLED: 'warning',
};

function summaryFor(job: AutoTranslateJobRow, t: Translate): string {
  if (job.status === 'SUCCEEDED') {
    return t('admin.localization.runSucceeded', { vars: { translated: job.translated_keys } });
  }
  if (job.status === 'CANCELLED') {
    return t('admin.localization.runCancelled', { vars: { translated: job.translated_keys } });
  }
  return t('admin.localization.runFailed');
}

interface Props {
  job: AutoTranslateJobRow;
}

/**
 * What one run is doing, or what it did.
 *
 * The keys that came back unusable are stated rather than folded into the
 * total: they are still untranslated, and the next run with "only the keys with
 * no text yet" sends exactly those — so the number is the instruction, not a
 * footnote.
 */
export default function AutoTranslateProgress({ job }: Readonly<Props>) {
  const { t } = useTranslation();

  if (job.status === 'RUNNING') {
    const percent = job.total_keys > 0 ? Math.round((job.done_keys / job.total_keys) * 100) : 0;
    return (
      <Stack spacing={1}>
        <LinearProgress variant="determinate" value={percent} />
        <Typography variant="body2">
          {t('admin.localization.runProgress', {
            vars: { done: job.done_keys, total: job.total_keys },
          })}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.localization.runHint')}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Alert severity={SEVERITY[job.status] ?? 'info'}>{summaryFor(job, t)}</Alert>
      {job.status === 'FAILED' && job.error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {job.error}
        </Typography>
      )}
      {job.failed_keys > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.localization.runSomeFailed', { vars: { failed: job.failed_keys } })}
        </Typography>
      )}
      {job.translated_keys > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.localization.runApplies')}
        </Typography>
      )}
      {job.ai_model && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.localization.modelUsed', { vars: { model: job.ai_model } })}
        </Typography>
      )}
    </Stack>
  );
}
