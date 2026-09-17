import { useState } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { CircularProgress, Tooltip } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { useBackgroundJobs } from './backgroundJobsContext';
import { BackgroundJobsDrawer } from './BackgroundJobsDrawer';
import { isRunning, overallPercent } from './job-progress';
import type { BackgroundJob } from './queries';

const needsAttention = (job: BackgroundJob): boolean => job.status === 'FAILED' || job.failed > 0;

/**
 * The header's global progress: a ring and the percentage across every
 * running job, or a tick (or a warning) once they are done. Hidden while there
 * is nothing to report. Pressing it opens the drawer that lists each process.
 *
 * The number is the server's, so it is the same after a page change, a
 * refresh, or in another console.
 */
export function BackgroundJobsIndicator() {
  const { t } = useTranslation();
  const api = useBackgroundJobs();
  const [open, setOpen] = useState(false);
  if (!api || api.jobs.length === 0) return null;

  const running = api.jobs.filter(isRunning).length;
  const percent = overallPercent(api.jobs);
  const attention = api.jobs.some(needsAttention);
  const label =
    running > 0
      ? t('shell.jobs.indicatorRunning', { count: running, vars: { percent } })
      : t('shell.jobs.indicatorDone');
  let icon = <TaskAltIcon fontSize="small" color="success" />;
  if (running > 0) icon = <CircularProgress variant="determinate" value={Math.max(percent, 4)} size={16} />;
  else if (attention) icon = <ErrorOutlineIcon fontSize="small" color="warning" />;

  return (
    <>
      <Tooltip title={label}>
        <DuncitButton
          size="small"
          variant="text"
          color="inherit"
          startIcon={icon}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          sx={{ minWidth: 0, px: 1, fontVariantNumeric: 'tabular-nums' }}
          data-testid="background-jobs-indicator"
        >
          {running > 0 ? t('shell.jobs.percent', { vars: { percent } }) : t('shell.jobs.tasks')}
        </DuncitButton>
      </Tooltip>
      <BackgroundJobsDrawer open={open} onClose={() => setOpen(false)} api={api} />
    </>
  );
}
