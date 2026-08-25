import { Alert, AlertTitle, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../server/format';
import type { RestoreJob } from './queries';

const SEVERITY = {
  RUNNING: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'error',
} as const;

/**
 * The most recent restore, shown above the table while it runs and after it
 * lands.
 *
 * It stays on screen once finished rather than disappearing: a restore is the
 * one thing here that changed the live database, and the next person to open
 * this page needs to see that it happened, from which archive, and whether it
 * got all the way through.
 */
export default function RestoreProgress({ job }: Readonly<{ job: RestoreJob }>) {
  const { t } = useTranslation();
  const running = job.status === 'RUNNING';

  const title = {
    RUNNING: t('tech.dbBackup.restoreRunning'),
    SUCCEEDED: t('tech.dbBackup.restoreSucceeded'),
    FAILED: t('tech.dbBackup.restoreFailed'),
  }[job.status];

  return (
    <Alert severity={SEVERITY[job.status]}>
      <AlertTitle>{title}</AlertTitle>
      <Stack spacing={0.5}>
        <Typography variant="body2">
          {t('tech.dbBackup.restoreFromFile', { vars: { file: job.backupFile } })}
        </Typography>
        <Typography variant="body2">
          {t('tech.dbBackup.restoreProgress', {
            vars: {
              collections: String(job.collectionsTotal),
              documents: job.documentsRestored.toLocaleString(),
            },
          })}
        </Typography>
        {running && job.currentCollection && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.dbBackup.restoreCurrent', { vars: { name: job.currentCollection } })}
          </Typography>
        )}
        {!running && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('tech.dbBackup.restoreFinishedAt', {
              vars: { when: formatDateTime(job.finishedAt) },
            })}
          </Typography>
        )}
        {job.error && <Typography variant="body2">{job.error}</Typography>}
        {running && <LinearProgress sx={{ mt: 1 }} />}
      </Stack>
    </Alert>
  );
}
