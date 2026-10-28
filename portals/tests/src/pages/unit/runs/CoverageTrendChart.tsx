import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import TimeSeriesChart from '../../stress-testing/run-detail/charts/TimeSeriesChart';
import { formatPct } from '../format';
import { UNIT_COVERAGE_TREND, type TrendPoint } from '../queries';

/** Runs on the chart — a month of nightly runs, or a busy week of pushes. */
const TREND_RUNS = 30;

/**
 * Coverage across the last finished runs: lines, branches and functions,
 * oldest on the left. The stress run charts' own time-series chart — the
 * validated palette, 2px lines and a crosshair tooltip — on one % axis.
 */
export default function CoverageTrendChart() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ unitTestCoverageTrend: TrendPoint[] }>(UNIT_COVERAGE_TREND, {
    variables: { limit: TREND_RUNS },
    fetchPolicy: 'cache-and-network',
  });
  const points = useMemo(() => data?.unitTestCoverageTrend ?? [], [data]);
  const labels = useMemo(() => points.map((p) => p.run_no), [points]);
  const series = useMemo(
    () => [
      { id: 'lines', label: t('testsUnit.coverage.lines'), values: points.map((p) => p.coverage?.lines.pct ?? null) },
      { id: 'branches', label: t('testsUnit.coverage.branches'), values: points.map((p) => p.coverage?.branches.pct ?? null) },
      { id: 'functions', label: t('testsUnit.coverage.functions'), values: points.map((p) => p.coverage?.functions.pct ?? null) },
    ],
    [points, t]
  );
  const format = useCallback((value: number) => formatPct(t, value), [t]);

  return (
    <QueryGuard loading={loading && points.length === 0} error={error} errorText={t('testsUnit.common.loadFailed')}>
      <TimeSeriesChart
        title={t('testsUnit.coverage.trendTitle')}
        subtitle={t('testsUnit.coverage.trendSubtitle')}
        labels={labels}
        series={series}
        format={format}
        emptyText={t('testsUnit.coverage.trendEmpty')}
      />
    </QueryGuard>
  );
}
