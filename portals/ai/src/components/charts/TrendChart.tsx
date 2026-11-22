import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useDateFormat } from '@duncit/app-settings';
import { categoryAxis, chartSeriesColor, chartTooltip, lineTrendDataset, lineTrendOptions, valueAxis } from '@duncit/ui';
import type { RankSeries } from './RankBars';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

interface Props {
  /** One 'yyyy-MM-dd' day per point, oldest first, in the admin's zone. */
  days: readonly string[];
  /** Up to three series of the same unit — never a second y-axis. */
  series: readonly RankSeries[];
  /** Stacked bars (parts of one total per day) or a line (a level over time). */
  type: 'bar' | 'line';
  format: (value: number) => string;
  /** What the chart shows, in one sentence, for screen readers. */
  summary: string;
}

/** A per-day trend over the dashboard's range; day labels use the admin's date format. */
export default function TrendChart({ days, series, type, format, summary }: Readonly<Props>) {
  const theme = useTheme();
  const { formatDay } = useDateFormat();
  const single = series.length === 1;
  const labels = useMemo(() => days.map((day) => formatDay(day)), [days, formatDay]);

  const lineData = useMemo(
    () => ({
      labels,
      datasets: series.map((s, index) => ({ label: s.label, data: [...s.data], ...lineTrendDataset(theme, index, single) })),
    }),
    [labels, series, single, theme]
  );
  const barData = useMemo(
    () => ({
      labels,
      datasets: series.map((s, index) => ({
        label: s.label,
        data: [...s.data],
        backgroundColor: chartSeriesColor(theme, index),
        borderColor: theme.palette.background.paper,
        borderWidth: { top: 2 },
        borderRadius: 2,
        borderSkipped: false,
      })),
    }),
    [labels, series, theme]
  );
  const options = useMemo(() => {
    const base = lineTrendOptions(theme, single);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...chartTooltip(theme),
          callbacks: {
            label: (item: TooltipItem<'bar' | 'line'>) => `${item.dataset.label}: ${format(item.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        x: { ...categoryAxis(theme), stacked: type === 'bar' },
        y: { ...valueAxis(theme, format), stacked: type === 'bar' },
      },
    };
  }, [format, single, theme, type]);

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 220 }}>
      {type === 'bar' ? (
        <Bar data={barData} options={options as ChartOptions<'bar'>} role="img" aria-label={summary} />
      ) : (
        <Line data={lineData} options={options as ChartOptions<'line'>} role="img" aria-label={summary} />
      )}
    </Box>
  );
}
