import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions, type TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { categoryAxis, chartSeriesColor, chartTooltip, valueAxis } from '@duncit/ui';

// Chart.js keeps one global registry; this is everything a horizontal bar chart draws.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface RankSeries {
  label: string;
  data: readonly number[];
}

interface Props {
  /** One label per bar, top to bottom. */
  labels: readonly string[];
  /** One series, or up to three stacked (the palette's validated cap). */
  series: readonly RankSeries[];
  /** How a value reads on the axis and in the tooltip. */
  format: (value: number) => string;
  /** What the chart shows, in one sentence, for screen readers. */
  summary: string;
  emptyText: string;
}

const ROW_PX = 26;
const FRAME_PX = 48;

/**
 * Ranked horizontal bars: the longest bar is the biggest value, read top to
 * bottom with the names left of the bars. One value axis, so a series that is
 * not the same unit belongs in another chart. A lone series is named by the
 * card around it, so its legend is hidden; stacked series get one.
 */
export default function RankBars({ labels, series, format, summary, emptyText }: Readonly<Props>) {
  const theme = useTheme();
  const stacked = series.length > 1;
  const data = useMemo(
    () => ({
      labels: [...labels],
      datasets: series.map((s, index) => ({
        label: s.label,
        data: [...s.data],
        backgroundColor: chartSeriesColor(theme, index),
        // The 2px surface gap between stacked segments keeps them apart.
        borderColor: theme.palette.background.paper,
        borderWidth: stacked ? 2 : 0,
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 18,
      })),
    }),
    [labels, series, stacked, theme]
  );
  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: stacked,
          position: 'top',
          align: 'start',
          labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: {
          ...chartTooltip(theme),
          callbacks: { label: (item: TooltipItem<'bar'>) => `${item.dataset.label}: ${format(item.parsed.x ?? 0)}` },
        },
      },
      scales: {
        x: { ...valueAxis(theme, format), stacked },
        y: { ...categoryAxis(theme, labels.length), stacked },
      },
    }),
    [format, labels.length, stacked, theme]
  );

  if (labels.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ position: 'relative', height: labels.length * ROW_PX + FRAME_PX }}>
      <Bar data={data} options={options} role="img" aria-label={summary} />
    </Box>
  );
}
