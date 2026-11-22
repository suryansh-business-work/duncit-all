import { Alert, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { LeadDiscoveryJob } from '../../api/leadResearch.gql';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import { JOB_STATUS_COLOR, JOB_STATUS_KEY, labelOf } from '../../lib/leadResearchLabels';
import { JobFailures, JobProgress, JobRequest, JobStats, PlannedSearches } from './DiscoveryJobDetails';

interface Props {
  job: LeadDiscoveryJob;
  /** Cancel or Retry is in flight for this job. */
  busy: boolean;
  /** Why the last Cancel or Retry of this job was refused. */
  error: string | null;
  onCancel: (jobId: string) => Promise<void>;
  onRetry: (jobId: string) => Promise<void>;
  onShowCandidates: (jobId: string) => void;
}

/** One discovery: what it searched, how far it got, what it found, and what went wrong. */
export default function DiscoveryJobCard({ job, busy, error, onCancel, onRetry, onShowCandidates }: Readonly<Props>) {
  const { t } = useTranslation();
  const running = job.status === 'RUNNING';
  const when = job.finished_at
    ? t('crm.leadResearch.jobFinishedAt', { vars: { started: formatDateTime(job.created_at), finished: formatDateTime(job.finished_at) } })
    : t('crm.leadResearch.jobStartedAt', { vars: { started: formatDateTime(job.created_at) } });

  return (
    <Card component="li" variant="outlined" sx={{ listStyle: 'none' }} data-testid={`discovery-job-${job.id}`}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {job.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('crm.leadResearch.jobMeta', { vars: { kind: t(LEAD_KIND_LABEL_KEY[job.lead_type]), when } })}
              </Typography>
            </Stack>
            <Chip size="small" color={JOB_STATUS_COLOR[job.status] ?? 'default'} label={labelOf(t, JOB_STATUS_KEY, job.status)} />
          </Stack>
          <JobProgress job={job} />
          <JobStats job={job} />
          <JobRequest job={job} />
          {job.plan_note ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {job.plan_note}
            </Typography>
          ) : null}
          <PlannedSearches job={job} />
          {job.error_message ? <Alert severity="error">{job.error_message}</Alert> : null}
          <JobFailures job={job} />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <DuncitButton size="small" startIcon={<FilterListIcon />} onClick={() => onShowCandidates(job.id)} data-testid={`job-show-${job.id}`}>
              {t('crm.leadResearch.showCandidates')}
            </DuncitButton>
            {running ? (
              <DuncitButton
                size="small"
                color="error"
                startIcon={<StopCircleIcon />}
                loading={busy}
                onClick={() => fireAndForget(onCancel(job.id), logs.portal.crm, 'LeadResearch', 'cancelDiscovery')}
                data-testid={`job-cancel-${job.id}`}
              >
                {t('crm.leadResearch.cancelDiscovery')}
              </DuncitButton>
            ) : (
              <DuncitButton
                size="small"
                startIcon={<ReplayIcon />}
                loading={busy}
                onClick={() => fireAndForget(onRetry(job.id), logs.portal.crm, 'LeadResearch', 'retryDiscovery')}
                data-testid={`job-retry-${job.id}`}
              >
                {t('crm.leadResearch.retryDiscovery')}
              </DuncitButton>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
