import { useMemo } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslation } from '@duncit/app-settings';
import { categoryAxis, chartSeriesColor, chartTooltip, valueAxis } from '@duncit/ui';
import './chart-setup';

export interface TrendSeries {
  label: string;
  values: (number | null)[];
}

interface Props {
  labels: string[];
  /** At most three — the validated palette's cap; a fourth measure is another chart. */
  series: TrendSeries[];
  ariaLabel: string;
  testId: string;
}

/**
 * One measure over the period on a single value axis. A lone series is filled
 * so its shape reads at a glance and needs no legend (the card names it);
 * several stay as lines with a legend so they can cross without hiding each other.
 */
export default function LineTrendChart({ labels, series, ariaLabel, testId }: Readonly<Props>) {
  const theme = useTheme();
  const { locale } = useTranslation();
  const single = series.length === 1;

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels,
      datasets: series.map((line, index) => {
        const color = chartSeriesColor(theme, index);
        return {
          label: line.label,
          data: line.values,
          borderColor: color,
          backgroundColor: single ? alpha(color, 0.12) : color,
          fill: single,
          borderWidth: 2,
          tension: 0.3,
          spanGaps: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
        };
      }),
    }),
    [labels, series, theme, single]
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
        tooltip: chartTooltip(theme),
      },
      scales: {
        x: categoryAxis(theme),
        y: valueAxis(theme, (value) => value.toLocaleString(locale)),
      },
    }),
    [theme, single, locale]
  );

  return (
    <Box sx={{ height: 260, position: 'relative' }} data-testid={testId}>
      <Line data={data} options={options} role="img" aria-label={ariaLabel} />
    </Box>
  );
}
