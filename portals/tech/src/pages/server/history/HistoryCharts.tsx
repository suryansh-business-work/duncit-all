import { useMemo } from 'react';
import { Box } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { useTranslation, type Translate } from '@duncit/shell';
import TimeSeriesChart, { type ChartSeries } from '../../stress-testing/run-detail/charts/TimeSeriesChart';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import type { ServerHistoryDay } from './queries';

interface Props {
  days: readonly ServerHistoryDay[];
}

interface ChartSpec {
  id: string;
  title: string;
  subtitle: string;
  series: ChartSeries[];
  format: (value: number) => string;
}

const pick = (days: readonly ServerHistoryDay[], field: keyof ServerHistoryDay) =>
  days.map((day) => {
    const value = day[field];
    return typeof value === 'number' ? value : null;
  });

/** One unit per chart, three series at most — two measures of a different unit never share an axis. */
function chartSpecs(t: Translate, days: readonly ServerHistoryDay[]): ChartSpec[] {
  return [
    {
      id: 'latency',
      title: t('tech.server.chartLatency'),
      subtitle: t('tech.server.chartLatencyHint'),
      format: formatMs,
      series: [
        { id: 'p95', label: t('tech.server.seriesApiP95'), values: pick(days, 'latencyP95Ms') },
        { id: 'worst', label: t('tech.server.seriesWorstP95'), values: pick(days, 'latencyPeakMs') },
        { id: 'probe', label: t('tech.server.seriesProbe'), values: pick(days, 'probeLatencyMs') },
      ],
    },
    {
      id: 'memory',
      title: t('tech.server.chartMemory'),
      subtitle: t('tech.server.chartMemoryHint'),
      format: formatPct,
      series: [
        { id: 'avg', label: t('tech.server.seriesAverage'), values: pick(days, 'memoryAvgPct') },
        { id: 'peak', label: t('tech.server.seriesPeak'), values: pick(days, 'memoryPeakPct') },
        { id: 'swap', label: t('tech.server.seriesSwapPeak'), values: pick(days, 'swapPeakPct') },
      ],
    },
    {
      id: 'disk',
      title: t('tech.server.chartDisk'),
      subtitle: t('tech.server.chartDiskHint'),
      format: formatPct,
      series: [{ id: 'used', label: t('tech.server.seriesUsed'), values: pick(days, 'diskPct') }],
    },
    {
      id: 'cpu',
      title: t('tech.server.chartCpu'),
      subtitle: t('tech.server.chartCpuHint'),
      format: formatPct,
      series: [
        { id: 'avg', label: t('tech.server.seriesAverage'), values: pick(days, 'cpuAvgPct') },
        { id: 'peak', label: t('tech.server.seriesPeak'), values: pick(days, 'cpuPeakPct') },
      ],
    },
    {
      id: 'traffic',
      title: t('tech.server.chartTraffic'),
      subtitle: t('tech.server.chartTrafficHint'),
      format: formatCount,
      series: [
        { id: 'requests', label: t('tech.server.seriesRequests'), values: pick(days, 'requests') },
        { id: 'errors', label: t('tech.server.series5xx'), values: pick(days, 'errors5xx') },
      ],
    },
    {
      id: 'loop',
      title: t('tech.server.chartEventLoop'),
      subtitle: t('tech.server.chartEventLoopHint'),
      format: formatMs,
      series: [{ id: 'p99', label: t('tech.server.seriesP99Peak'), values: pick(days, 'eventLoopP99PeakMs') }],
    },
  ];
}

/** The month per day: latency, memory, disk, CPU, traffic and event-loop lag. */
export default function HistoryCharts({ days }: Readonly<Props>) {
  const { t } = useTranslation();
  const hasReadings = days.some((day) => day.samples > 0 || day.probeLatencyMs != null);
  const labels = useMemo(() => (hasReadings ? days.map((day) => formatDay(day.date)) : []), [days, hasReadings]);
  const charts = useMemo(() => chartSpecs(t, days), [t, days]);
  const emptyText = t('tech.server.chartEmpty');

  return (
    <Box
      data-testid="server-history-charts"
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}
    >
      {charts.map((chart) => (
        <TimeSeriesChart
          key={chart.id}
          title={chart.title}
          subtitle={chart.subtitle}
          labels={labels}
          series={chart.series}
          format={chart.format}
          emptyText={emptyText}
        />
      ))}
    </Box>
  );
}
