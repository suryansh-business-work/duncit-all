import { useMemo } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDay, useTranslation } from '@duncit/app-settings';
import { chartSeriesColor } from '@duncit/ui';
import { KPI_COPY, SERIES_COPY } from './copy';
import { formatValue } from './format';
import { categoryAxis, chartTooltip, valueAxis } from './chart-theme';
import type { AnalyticsTrend } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

function seriesLabel(key: string, t: Translate): string {
  const own = SERIES_COPY[key];
  if (own) return t(own);
  const tile = KPI_COPY[key];
  return tile ? t(tile.title) : key;
}

/**
 * One measure over the period, up to three series on a single value axis — a
 * second measure with its own scale gets its own chart instead. A lone series
 * is filled so its shape reads at a glance; several stay as lines so they can
 * cross without hiding each other. The widget around it carries the title.
 */
export default function TrendChart({ trend, label }: Readonly<{ trend: AnalyticsTrend; label: string }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const single = trend.series.length === 1;

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels: trend.buckets.map((bucket) => formatDay(bucket)),
      datasets: trend.series.map((series, index) => {
        const color = chartSeriesColor(theme, index);
        return {
          label: seriesLabel(series.key, t),
          data: series.values,
          borderColor: color,
          backgroundColor: single ? alpha(color, 0.12) : color,
          fill: single,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
        };
      }),
    }),
    [trend, theme, t, single]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: !single,
          position: 'top',
          align: 'start',
          labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: {
          ...chartTooltip(theme),
          callbacks: {
            label: (item) => `${item.dataset.label ?? ''}: ${formatValue(item.parsed.y, trend.format)}`,
          },
        },
      },
      scales: {
        x: categoryAxis(theme),
        y: valueAxis(theme, (value) => formatValue(value, trend.format)),
      },
    }),
    [theme, single, trend.format]
  );

  return (
    <Box sx={{ height: 260, position: 'relative' }} data-testid={`analytics-trend-${trend.key}`}>
      <Line data={data} options={options} role="img" aria-label={label} />
    </Box>
  );
}
