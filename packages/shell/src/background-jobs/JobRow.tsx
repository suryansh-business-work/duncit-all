import CloseIcon from '@mui/icons-material/Close';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { Box, LinearProgress, Link, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';
import { isRunning, jobPercent } from './job-progress';
import type { BackgroundJob, BackgroundJobKind, BackgroundJobStatus } from './queries';

const STATUS_COLORS: StatusColorMap = {
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

/** Literal keys per status, so the localization gate can see every one. */
const CHIP_COPY: Readonly<Record<BackgroundJobStatus, string>> = {
  RUNNING: 'shell.jobs.statusRunning',
  COMPLETED: 'shell.jobs.statusCompleted',
  FAILED: 'shell.jobs.statusFailed',
  CANCELLED: 'shell.jobs.statusCancelled',
};

/** What a job is called at each status — a delete counts rows, a translation keys. */
const TITLE_COPY: Readonly<Record<BackgroundJobKind, Readonly<Record<BackgroundJobStatus, string>>>> = {
  BULK_DELETE: {
    RUNNING: 'shell.jobs.deleting',
    COMPLETED: 'shell.jobs.deleted',
    FAILED: 'shell.jobs.stopped',
    CANCELLED: 'shell.jobs.cancelled',
  },
  AI_TRANSLATE: {
    RUNNING: 'shell.jobs.translating',
    COMPLETED: 'shell.jobs.translated',
    FAILED: 'shell.jobs.translateStopped',
    CANCELLED: 'shell.jobs.translateCancelled',
  },
};

/** The line under the bar when some of the work did not land. */
const FAILED_COPY: Readonly<Record<BackgroundJobKind, string>> = {
  BULK_DELETE: 'shell.jobs.failedRows',
  AI_TRANSLATE: 'shell.jobs.unusableKeys',
};

const BAR_COLOR: Readonly<Record<BackgroundJobStatus, 'info' | 'success' | 'error' | 'inherit'>> = {
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'inherit',
};

export interface JobRowProps {
  job: BackgroundJob;
  onCancel: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

/** One job in the drawer: what it is, where it came from, how far it got, and why it stopped. */
export function JobRow({ job, onCancel, onDismiss }: Readonly<JobRowProps>) {
  const { t } = useTranslation();
  const percent = jobPercent(job);
  const running = isRunning(job);
  const count = running ? job.total : job.succeeded;
  const reason = job.error_message || job.failures[0]?.message;
  const actionLabel = running ? t('shell.jobs.cancel') : t('shell.jobs.dismiss');
  const actionTestId = running ? `background-job-cancel-${job.id}` : `background-job-dismiss-${job.id}`;

  return (
    <Box sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }} data-testid={`background-job-${job.id}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{t(TITLE_COPY[job.kind][job.status], { count })}</Typography>
          {job.label && (
            <Link href={job.url} variant="caption" underline="hover" sx={{ display: 'block' }} noWrap>
              {job.label}
            </Link>
          )}
        </Box>
        <StatusChip status={job.status} colorMap={STATUS_COLORS} label={t(CHIP_COPY[job.status])} />
        <Tooltip title={actionLabel}>
          <DuncitIconButton
            size="small"
            aria-label={actionLabel}
            onClick={() => (running ? onCancel(job.id) : onDismiss(job.id))}
            data-testid={actionTestId}
          >
            {running ? <StopCircleOutlinedIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
          </DuncitIconButton>
        </Tooltip>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={BAR_COLOR[job.status]}
        sx={{ mt: 1, borderRadius: 1 }}
        aria-label={t('shell.jobs.progressLabel', { vars: { percent } })}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {t('shell.jobs.progress', {
          vars: { done: job.succeeded + job.failed, total: job.total, percent },
        })}
      </Typography>
      {job.failed > 0 && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>
          {t(FAILED_COPY[job.kind], { count: job.failed })}
        </Typography>
      )}
      {reason && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {reason}
        </Typography>
      )}
    </Box>
  );
}
