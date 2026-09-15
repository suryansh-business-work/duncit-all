import { Link as RouterLink } from 'react-router';
import { Alert, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EnvironmentChip, RunStatusChip } from '../components/RunStatusChip';
import { isLiveRun, type StressRun } from '../queries';

interface Props {
  run: StressRun;
  onStop: () => void;
  onDownload: () => void;
}

/** Which run, where it points, and the one button that matters while it is live. */
export default function RunHeader({ run, onStop, onDownload }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = isLiveRun(run.status);
  const canStop = run.status === 'QUEUED' || run.status === 'RUNNING';
  const endReason = run.stop_reason || run.error_message;
  const endSeverity = run.status === 'FAILED' || run.terminated ? 'error' : 'warning';

  return (
    <Stack spacing={1.5}>
      <Link component={RouterLink} to="/stress-testing/runs" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}>
        <ArrowBackIcon fontSize="small" />
        {t('tech.stress.backToRuns')}
      </Link>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {run.run_no}
            </Typography>
            <RunStatusChip status={run.status} />
            <EnvironmentChip environment={run.environment} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.stress.runTargets', { vars: { mweb: run.target_mweb_url, api: run.target_graphql_url, by: run.triggered_by } })}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {!live && (
            <DuncitButton startIcon={<DownloadIcon />} onClick={onDownload}>
              {t('tech.stress.downloadReport')}
            </DuncitButton>
          )}
          {run.workflow_run_url && (
            <DuncitButton href={run.workflow_run_url} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewIcon />}>
              {t('tech.stress.openWorkflow')}
            </DuncitButton>
          )}
          {live && (
            <DuncitButton variant="contained" color="error" startIcon={<StopCircleIcon />} onClick={onStop} disabled={!canStop}>
              {run.status === 'STOPPING' ? t('tech.stress.stopping') : t('tech.stress.stopRun')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
      {run.status === 'QUEUED' && <Alert severity="info">{t('tech.stress.queuedHint')}</Alert>}
      {endReason && <Alert severity={endSeverity}>{endReason}</Alert>}
    </Stack>
  );
}
