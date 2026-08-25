import { Alert, Chip, Divider, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatBytes, formatDateTime } from '../server/format';
import CloneCollectionList from './CloneCollectionList';
import type { CloneJob, CloneJobStatus } from './queries';

type ChipColor = 'info' | 'success' | 'error';

const STATUS_COLOR: Record<CloneJobStatus, ChipColor> = {
  RUNNING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'error',
};

const STATUS_KEY: Record<CloneJobStatus, string> = {
  RUNNING: 'tech.dataClone.statusRunning',
  SUCCEEDED: 'tech.dataClone.statusSucceeded',
  FAILED: 'tech.dataClone.statusFailed',
};

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** Live state of one job: headline, overall bar, totals, then the per-collection feed. */
export default function CloneProgressCard({ job }: Readonly<{ job: CloneJob }>) {
  const { t } = useTranslation();
  const percent = job.collectionsTotal > 0 ? (job.collectionsDone / job.collectionsTotal) * 100 : 0;
  const running = job.status === 'RUNNING';
  const showIndeterminate = running && job.collectionsTotal === 0;
  const progressLabel = t('tech.dataClone.collectionsProgress', {
    vars: { done: job.collectionsDone, total: job.collectionsTotal },
  });
  const copyingLabel =
    running && job.currentCollection
      ? t('tech.dataClone.copying', { vars: { name: job.currentCollection } })
      : progressLabel;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Chip size="small" color={STATUS_COLOR[job.status]} label={t(STATUS_KEY[job.status])} />
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: "text.secondary",
              flex: 1,
              minWidth: 0
            }}>
            {copyingLabel}
          </Typography>
        </Stack>

        {showIndeterminate ? (
          <LinearProgress />
        ) : (
          <LinearProgress variant="determinate" value={percent} />
        )}

        <Stack direction="row" spacing={4} sx={{
          flexWrap: "wrap"
        }}>
          <Stat label={t('tech.dataClone.collections')} value={progressLabel} />
          <Stat
            label={t('tech.dataClone.documentsCopied')}
            value={job.documentsCopied.toLocaleString()}
          />
          <Stat label={t('tech.dataClone.dataCopied')} value={formatBytes(job.bytesCopied)} />
        </Stack>

        <Stack direction="row" spacing={2} sx={{
          flexWrap: "wrap"
        }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('tech.dataClone.startedAt', { vars: { when: formatDateTime(job.startedAt) } })}
          </Typography>
          {job.finishedAt && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('tech.dataClone.finishedAt', { vars: { when: formatDateTime(job.finishedAt) } })}
            </Typography>
          )}
          {job.startedBy && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('tech.dataClone.startedBy', { vars: { who: job.startedBy } })}
            </Typography>
          )}
        </Stack>

        {job.error && <Alert severity="error">{job.error}</Alert>}

        <Divider />
        <CloneCollectionList collections={job.collections} />
      </Stack>
    </Paper>
  );
}
