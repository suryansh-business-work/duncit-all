import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StorageIcon from '@mui/icons-material/Storage';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import CloneExcludedCard from './CloneExcludedCard';
import CloneProgressCard from './CloneProgressCard';
import LeaveCloneDialog from './LeaveCloneDialog';
import { useCloneJob } from './useCloneJob';
import { useCloneNavigationGuard } from './useCloneNavigationGuard';
import {
  DATA_CLONE_TARGETS,
  START_DATA_CLONE,
  type CloneJob,
  type CloneTargets,
} from './queries';

/**
 * Production -> staging data clone.
 *
 * The button only kicks the job off: the copy itself runs on the server, so
 * this page is a viewer. It polls while the job runs, warns before an in-app
 * navigation (MUI dialog) and before a browser close (beforeunload), and stops
 * polling the moment the job is no longer RUNNING.
 */
export default function DataClonePage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [startError, setStartError] = useState<string | null>(null);

  const targetsQuery = useQuery<{ dataCloneTargets: CloneTargets }>(DATA_CLONE_TARGETS, {
    fetchPolicy: 'cache-and-network',
  });
  const targets = targetsQuery.data?.dataCloneTargets;

  const { job, running, loading, refetch } = useCloneJob();
  const [start, startState] = useMutation<{ startDataClone: CloneJob }>(START_DATA_CLONE);
  const guard = useCloneNavigationGuard(running);

  const handleStart = async () => {
    setStartError(null);
    const ok = await confirm({
      title: t('tech.dataClone.confirmTitle'),
      message: t('tech.dataClone.confirmMessage', {
        vars: { source: targets?.sourceDatabase ?? '', target: targets?.targetDatabase ?? '' },
      }),
      confirmLabel: t('tech.dataClone.confirmAction'),
      cancelLabel: t('tech.dataClone.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await start();
      await refetch();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : t('tech.dataClone.statusFailed'));
    }
  };

  const excluded = job?.excluded ?? targets?.excluded ?? [];
  const busy = !targets?.ready || running || startState.loading;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <StorageIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            {t('tech.dataClone.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('tech.dataClone.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" color="error" onClick={handleStart} disabled={busy}>
          {startState.loading ? t('tech.dataClone.starting') : t('tech.dataClone.start')}
        </Button>
      </Stack>

      {(loading || targetsQuery.loading) && <LinearProgress />}

      {targets && !targets.ready && (
        <Alert severity="error">
          {t('tech.dataClone.notConfigured')} {targets.error}
        </Alert>
      )}

      {targets?.ready && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            variant="outlined"
            label={`${t('tech.dataClone.source')}: ${targets.sourceDatabase}`}
          />
          <ArrowForwardIcon fontSize="small" color="disabled" />
          <Chip color="warning" label={`${t('tech.dataClone.target')}: ${targets.targetDatabase}`} />
        </Stack>
      )}

      {startError && (
        <Alert severity="error" onClose={() => setStartError(null)}>
          {startError}
        </Alert>
      )}

      {job && <CloneProgressCard job={job} />}
      {!job && !loading && <Alert severity="info">{t('tech.dataClone.empty')}</Alert>}

      {excluded.length > 0 && <CloneExcludedCard excluded={excluded} />}

      <LeaveCloneDialog open={!!guard.pendingPath} onStay={guard.stay} onLeave={guard.leave} />
    </Stack>
  );
}
