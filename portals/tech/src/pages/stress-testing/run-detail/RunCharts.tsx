import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import TimeSeriesChart, { type ChartSeries } from './charts/TimeSeriesChart';
import type { StressSample } from '../queries';
import { formatCount, formatMs, formatPct, formatRps, formatSeconds } from '../labels';

interface Props {
  samples: readonly StressSample[];
  startedAt: string | null;
}

/** "3m 20s" into the run, for each sample. */
function elapsedLabels(samples: readonly StressSample[], startedAt: string | null): string[] {
  const origin = Date.parse(startedAt ?? samples[0]?.at ?? '');
  return samples.map((s) => formatSeconds((Date.parse(s.at) - origin) / 1000));
}

const pick = (samples: readonly StressSample[], fn: (s: StressSample) => number) => samples.map(fn);

/**
 * The run's time series, one measure per chart. Each chart holds ONE unit —
 * load, latency, people, errors, host, event loop — because two scales on one
 * axis would let a line look alarming or calm purely by where its axis sits.
 */
export default function RunCharts({ samples, startedAt }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => elapsedLabels(samples, startedAt), [samples, startedAt]);
  const emptyText = t('tech.stress.chartEmpty');

  const charts = useMemo(() => {
    const series = (id: string, label: string, fn: (s: StressSample) => number): ChartSeries => ({
      id,
      label,
      values: pick(samples, fn),
    });
    return [
      {
        id: 'throughput',
        title: t('tech.stress.chartThroughput'),
        subtitle: t('tech.stress.chartThroughputHint'),
        format: formatRps,
        series: [
          series('bots', t('tech.stress.seriesBotRps'), (s) => s.load.rps),
          series('server', t('tech.stress.seriesServerRps'), (s) => s.server.rps_total),
          series('real', t('tech.stress.seriesRealRps'), (s) => Math.max(0, s.server.rps_total - s.server.rps_stress)),
        ],
      },
      {
        id: 'latency',
        title: t('tech.stress.chartLatency'),
        subtitle: t('tech.stress.chartLatencyHint'),
        format: formatMs,
        series: [
          series('p50', t('tech.stress.seriesP50'), (s) => s.load.p50_ms),
          series('p95', t('tech.stress.seriesP95'), (s) => s.load.p95_ms),
          series('p99', t('tech.stress.seriesP99'), (s) => s.load.p99_ms),
        ],
      },
      {
        id: 'people',
        title: t('tech.stress.chartPeople'),
        subtitle: t('tech.stress.chartPeopleHint'),
        format: formatCount,
        series: [
          series('vus', t('tech.stress.seriesVirtualUsers'), (s) => s.load.active_vus),
          series('real', t('tech.stress.seriesRealUsers'), (s) => s.server.real_users + s.server.visitors),
          series('bots', t('tech.stress.seriesBrowserBots'), (s) => s.load.active_bots),
        ],
      },
      {
        id: 'errors',
        title: t('tech.stress.chartErrors'),
        subtitle: t('tech.stress.chartErrorsHint'),
        format: formatPct,
        series: [series('rate', t('tech.stress.seriesErrorRate'), (s) => s.load.error_rate_pct)],
      },
      {
        id: 'host',
        title: t('tech.stress.chartHost'),
        subtitle: t('tech.stress.chartHostHint'),
        format: formatPct,
        series: [
          series('cpu', t('tech.stress.seriesCpu'), (s) => s.server.host_cpu_pct),
          series('memory', t('tech.stress.seriesMemory'), (s) => s.server.host_memory_pct),
        ],
      },
      {
        id: 'loop',
        title: t('tech.stress.chartEventLoop'),
        subtitle: t('tech.stress.chartEventLoopHint'),
        format: formatMs,
        series: [
          series('lag', t('tech.stress.seriesEventLoop'), (s) => s.server.event_loop_lag_ms),
          series('server-p95', t('tech.stress.seriesServerP95'), (s) => s.server.server_p95_ms),
        ],
      },
    ];
  }, [samples, t]);

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
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
