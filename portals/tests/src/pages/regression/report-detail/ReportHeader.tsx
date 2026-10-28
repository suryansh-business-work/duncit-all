import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import StatusChip from '../../unit/components/StatusChip';
import MetricGrid, { type Metric } from '../../unit/components/MetricGrid';
import { formatDelta } from '../../unit/format';
import { BUCKET_COUNTS, useRegressionLabels } from '../labels';
import type { RegressionReportDetail } from '../queries';

/** Where the run this report is about lives in the console. E2E runs have no page of their own. */
const runPath = (report: RegressionReportDetail) =>
  report.kind === 'UNIT' ? `/unit/runs/${report.run_id}` : '/e2e/runs';

/** Which runs were compared, the verdict, and every bucket's count. */
export default function ReportHeader({ report }: Readonly<{ report: RegressionReportDetail }>) {
  const { t } = useTranslation();
  const labels = useRegressionLabels();
  const dates = useDateFormat({ timeZoneAware: true });
  const metrics = useMemo<Metric[]>(() => {
    const counts: Metric[] = BUCKET_COUNTS.map(({ bucket, field }) => ({
      id: bucket,
      label: labels.bucket[bucket],
      value: report.counts[field],
      valueColor: (bucket === 'REGRESSED' || bucket === 'NEW_FAILING') && report.counts[field] > 0 ? 'error.main' : undefined,
    }));
    if (report.kind !== 'UNIT') return counts;
    return [
      ...counts,
      {
        id: 'lines',
        label: t('testsUnit.regression.col.linesDelta'),
        value: formatDelta(t, report.coverage_total?.lines_delta),
      },
    ];
  }, [labels, report, t]);

  return (
    <Stack spacing={2}>
      <Link
        component={RouterLink}
        to="/regression/reports"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}
      >
        <ArrowBackIcon fontSize="small" />
        {t('testsUnit.regression.back')}
      </Link>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('testsUnit.regression.detailTitle', { vars: { kind: labels.kind[report.kind], run: report.run_no } })}
            </Typography>
            <StatusChip status={report.status} label={labels.status[report.status]} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('testsUnit.regression.comparedLine', {
              vars: {
                run: report.run_no,
                base: report.base_run_no || EM_DASH,
                branch: report.branch || EM_DASH,
                when: dates.formatDateTime(report.created_at),
              },
            })}
          </Typography>
        </Stack>
        <DuncitButton component={RouterLink} to={runPath(report)} startIcon={<ListAltIcon />}>
          {t('testsUnit.regression.openRun')}
        </DuncitButton>
      </Stack>
      <MetricGrid metrics={metrics} />
      {report.truncated && (
        <Alert severity="info">{t('testsUnit.regression.truncated', { vars: { kept: report.items_kept } })}</Alert>
      )}
      {report.items_purged && <Alert severity="info">{t('testsUnit.regression.itemsPurged')}</Alert>}
      {report.skipped_workspaces.length > 0 && (
        <Alert severity="warning">
          {t('testsUnit.regression.skipped', { vars: { workspaces: report.skipped_workspaces.join(', ') } })}
        </Alert>
      )}
    </Stack>
  );
}
