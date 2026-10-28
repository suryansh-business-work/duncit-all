import { useMemo } from 'react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { TestsCoveragePoint } from '@duncit/gql-types';
// Tech's own chart, mounted here as it is (one implementation, two doors): the
// validated console palette, 2px lines and a crosshair tooltip. The Dockerfile
// copies Tech's src for the build.
import TimeSeriesChart from '../stress-testing/run-detail/charts/TimeSeriesChart';

type Props = Readonly<{ trend: readonly TestsCoveragePoint[] }>;

const asPercent = (value: number) => `${Math.round(value)}%`;

/** Total line and branch coverage of each finished unit run, oldest first. One axis, one unit. */
export default function CoverageTrendCard({ trend }: Props) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  // Two points are the least that make a line; one run is a number, not a trend.
  const points = useMemo(() => (trend.length >= 2 ? trend : []), [trend]);
  const labels = useMemo(() => points.map((p) => (p.finished_at ? formatDateTime(p.finished_at) : '')), [points, formatDateTime]);
  const series = useMemo(
    () => [
      { id: 'lines', label: t('tests.dashboard.coverage.lines'), values: points.map((p) => p.lines ?? null) },
      { id: 'branches', label: t('tests.dashboard.coverage.branches'), values: points.map((p) => p.branches ?? null) },
    ],
    [points, t]
  );

  return (
    <TimeSeriesChart
      title={t('tests.dashboard.coverage.trendTitle')}
      subtitle={t('tests.dashboard.coverage.trendSubtitle')}
      labels={labels}
      series={series}
      format={asPercent}
      emptyText={t('tests.dashboard.coverage.trendEmpty')}
    />
  );
}
