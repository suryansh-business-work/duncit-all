import { useMemo } from 'react';
import { Box } from '@mui/material';
import { formatDateTime, formatTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import TimeSeriesChart from '../../stress-testing/run-detail/charts/TimeSeriesChart';
import { formatCount, formatMs } from '../../stress-testing/labels';
import { isShortRange } from '../labels';
import type { MonitorPoint, MonitorRange } from '../queries';

interface Props {
  series: readonly MonitorPoint[];
  range: MonitorRange;
  testId: string;
}

/**
 * Traffic and latency over the range, one unit per chart — the two charts
 * GraphOS opens an operation with. Bins are filled in by the server, so an idle
 * stretch reads as zero rather than as a line drawn across it.
 */
export default function MonitorCharts({ series, range, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => {
    const format = isShortRange(range) ? formatTime : formatDateTime;
    return series.map((point) => format(point.at));
  }, [series, range]);

  const traffic = useMemo(
    () => [
      { id: 'requests', label: t('tech.graphqlMonitor.seriesRequests'), values: series.map((p) => p.requests) },
      { id: 'errors', label: t('tech.graphqlMonitor.seriesErrors'), values: series.map((p) => p.errors) },
    ],
    [series, t]
  );
  const latency = useMemo(
    () => [
      { id: 'p50', label: t('tech.graphqlMonitor.seriesP50'), values: series.map((p) => p.p50_ms) },
      { id: 'p95', label: t('tech.graphqlMonitor.seriesP95'), values: series.map((p) => p.p95_ms) },
      { id: 'p99', label: t('tech.graphqlMonitor.seriesP99'), values: series.map((p) => p.p99_ms) },
    ],
    [series, t]
  );
  const emptyText = t('tech.graphqlMonitor.chartEmpty');

  return (
    <Box
      data-testid={`${testId}-charts`}
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}
    >
      <TimeSeriesChart
        title={t('tech.graphqlMonitor.chartTraffic')}
        subtitle={t('tech.graphqlMonitor.chartTrafficHint')}
        labels={labels}
        series={traffic}
        format={formatCount}
        emptyText={emptyText}
      />
      <TimeSeriesChart
        title={t('tech.graphqlMonitor.chartLatency')}
        subtitle={t('tech.graphqlMonitor.chartLatencyHint')}
        labels={labels}
        series={latency}
        format={formatMs}
        emptyText={emptyText}
      />
    </Box>
  );
}
