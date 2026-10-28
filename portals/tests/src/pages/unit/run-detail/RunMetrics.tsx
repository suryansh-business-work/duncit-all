import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import MetricGrid, { type Metric } from '../components/MetricGrid';
import { formatDuration, formatPct } from '../format';
import type { UnitRunDetail } from '../queries';

const barOf = (pct: number | null | undefined): number | undefined => (pct == null ? undefined : pct);

/** The run at a glance: test counts, how long it took, and the four coverage figures. */
export default function RunMetrics({ run }: Readonly<{ run: UnitRunDetail }>) {
  const { t } = useTranslation();
  const metrics = useMemo<Metric[]>(() => {
    const { totals, coverage } = run;
    return [
      {
        id: 'tests',
        label: t('testsUnit.metrics.tests'),
        value: totals.tests,
        hint: t('testsUnit.metrics.files', { vars: { files: totals.suites } }),
      },
      { id: 'passed', label: t('testsUnit.metrics.passed'), value: totals.passed, valueColor: 'success.main' },
      {
        id: 'failed',
        label: t('testsUnit.metrics.failed'),
        value: totals.failed,
        valueColor: totals.failed > 0 ? 'error.main' : undefined,
        hint: t('testsUnit.metrics.filesFailed', { vars: { files: totals.suites_failed } }),
      },
      {
        id: 'skipped',
        label: t('testsUnit.metrics.skipped'),
        value: totals.skipped,
        hint: t('testsUnit.metrics.todo', { vars: { todo: totals.todo } }),
      },
      {
        id: 'duration',
        label: t('testsUnit.metrics.duration'),
        value: formatDuration(t, run.duration_ms),
        hint: t('testsUnit.metrics.suiteTime', { vars: { time: formatDuration(t, totals.duration_ms) } }),
      },
      {
        id: 'lines',
        label: t('testsUnit.coverage.lines'),
        value: formatPct(t, coverage?.lines.pct),
        percent: barOf(coverage?.lines.pct),
      },
      {
        id: 'branches',
        label: t('testsUnit.coverage.branches'),
        value: formatPct(t, coverage?.branches.pct),
        percent: barOf(coverage?.branches.pct),
      },
      {
        id: 'functions',
        label: t('testsUnit.coverage.functions'),
        value: formatPct(t, coverage?.functions.pct),
        percent: barOf(coverage?.functions.pct),
      },
      {
        id: 'statements',
        label: t('testsUnit.coverage.statements'),
        value: formatPct(t, coverage?.statements.pct),
        percent: barOf(coverage?.statements.pct),
        hint: t('testsUnit.coverage.statementsHint'),
      },
    ];
  }, [run, t]);

  return <MetricGrid metrics={metrics} />;
}
