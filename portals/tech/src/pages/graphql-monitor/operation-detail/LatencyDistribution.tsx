import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarElement, Chart as ChartJS, type ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../../stress-testing/components/SectionCard';
import { seriesColor } from '../../stress-testing/run-detail/charts/chartSetup';
import { formatCount, formatMs } from '../../stress-testing/labels';

// The shared setup registers the line chart's elements; a bar needs its own.
ChartJS.register(BarElement);

interface Props {
  buckets: ReadonlyArray<{ le_ms: number; count: number }>;
}

/** How many requests finished within each duration — the shape a percentile hides. */
export default function LatencyDistribution({ buckets }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const data = useMemo(
    () => ({
      labels: buckets.map((bucket) => formatMs(bucket.le_ms)),
      datasets: [
        {
          label: t('tech.graphqlMonitor.seriesRequests'),
          data: buckets.map((bucket) => bucket.count),
          backgroundColor: seriesColor(theme, 0),
          borderRadius: 2,
        },
      ],
    }),
    [buckets, t, theme]
  );
  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: t('tech.graphqlMonitor.distributionAxis'), color: theme.palette.text.secondary },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 12, autoSkip: true, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.palette.divider },
          border: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 5, callback: (value) => formatCount(Number(value)) },
        },
      },
    }),
    [t, theme]
  );

  return (
    <SectionCard title={t('tech.graphqlMonitor.distributionTitle')} subtitle={t('tech.graphqlMonitor.distributionSubtitle')}>
      <Box sx={{ height: 240, position: 'relative' }} data-testid="graphql-monitor-latency-distribution">
        {buckets.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', pt: 8, textAlign: 'center' }}>
            {t('tech.graphqlMonitor.chartEmpty')}
          </Typography>
        ) : (
          <Bar data={data} options={options} aria-label={t('tech.graphqlMonitor.distributionTitle')} role="img" />
        )}
      </Box>
    </SectionCard>
  );
}
