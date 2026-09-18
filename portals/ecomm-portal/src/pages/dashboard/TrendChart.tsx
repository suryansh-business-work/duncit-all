import { useMemo } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { chartSeriesColor, SectionCard } from '@duncit/ui';

// Chart.js keeps one registry; this is everything a trend line draws.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface TrendChartProps {
  title: string;
  /** One sentence summing the line up — the chart's accessible name. */
  summary: string;
  labels: readonly string[];
  values: readonly number[];
  format: (value: number) => string;
}

/**
 * One measure over the period, as a single filled line. Two measures of
 * different scale get two of these rather than a second axis. Hovering a day
 * shows its value; the title names the series, so there is no legend.
 */
export default function TrendChart({ title, summary, labels, values, format }: Readonly<TrendChartProps>) {
  const theme = useTheme();
  const color = chartSeriesColor(theme, 0);
  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels: [...labels],
      datasets: [
        {
          label: title,
          data: [...values],
          borderColor: color,
          backgroundColor: alpha(color, 0.12),
          fill: true,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
        },
      ],
    }),
    [labels, values, title, color],
  );
  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.primary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          callbacks: { label: (item) => format(item.parsed.y ?? 0) },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: theme.palette.text.secondary, autoSkip: true, maxTicksLimit: 8, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.palette.divider },
          border: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 5, callback: (value) => format(Number(value)) },
        },
      },
    }),
    [theme, format],
  );
  return (
    <SectionCard title={title}>
      <Box sx={{ height: 240, position: 'relative' }}>
        <Line data={data} options={options} role="img" aria-label={summary} />
      </Box>
    </SectionCard>
  );
}
