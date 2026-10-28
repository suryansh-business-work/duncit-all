import { Link as RouterLink } from 'react-router';
import { Alert, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import StatusChip from '../components/StatusChip';
import { shortSha } from '../format';
import { useUnitLabels } from '../labels';
import type { UnitRunDetail } from '../queries';

/** Which run, what started it and where it ran — and the links out of it. */
export default function RunHeader({ run }: Readonly<{ run: UnitRunDetail }>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const dates = useDateFormat({ timeZoneAware: true });
  const started = run.started_at ? dates.formatDateTime(run.started_at) : EM_DASH;

  return (
    <Stack spacing={1.5}>
      <Link
        component={RouterLink}
        to="/unit/runs"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}
      >
        <ArrowBackIcon fontSize="small" />
        {t('testsUnit.detail.back')}
      </Link>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {run.run_no}
            </Typography>
            <StatusChip status={run.status} label={labels.runStatus[run.status]} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('testsUnit.detail.subtitle', {
              vars: {
                workflow: labels.workflow[run.workflow],
                trigger: labels.trigger[run.trigger],
                branch: run.branch || EM_DASH,
                commit: shortSha(run.commit_sha),
                by: run.triggered_by || EM_DASH,
                started,
              },
            })}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {run.regression_report_id && (
            <DuncitButton
              component={RouterLink}
              to={`/regression/reports/${run.regression_report_id}`}
              startIcon={<CompareArrowsIcon />}
            >
              {t('testsUnit.detail.regressionReport')}
            </DuncitButton>
          )}
          {run.github_run_url && (
            <DuncitButton href={run.github_run_url} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewIcon />}>
              {t('testsUnit.runs.openGithub')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
      {run.status === 'QUEUED' && <Alert severity="info">{t('testsUnit.detail.queuedHint')}</Alert>}
      {run.status === 'RUNNING' && <Alert severity="info">{t('testsUnit.detail.runningHint')}</Alert>}
      {run.error_message && (
        <Alert severity={run.status === 'CANCELLED' ? 'warning' : 'error'}>{run.error_message}</Alert>
      )}
      {run.details_purged && <Alert severity="info">{t('testsUnit.detail.purged')}</Alert>}
    </Stack>
  );
}
