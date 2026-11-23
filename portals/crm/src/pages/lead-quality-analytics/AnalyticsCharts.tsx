import { useMemo, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from '@duncit/shell';
import { categoryAxis, chartSeriesColor, chartTooltip, lineTrendDataset, lineTrendOptions, valueAxis } from '@duncit/ui';
import { formatWeek, type CountRow, type TrendRow } from './analyticsData';

// Chart.js keeps one global registry: everything these bar and line charts draw.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip);

/** Chart height in theme spacing units. */
const CHART_UNITS = 34;
const plain = (value: number) => String(value);

function ChartFrame({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useTheme();
  return <Box sx={{ position: 'relative', height: theme.spacing(CHART_UNITS) }}>{children}</Box>;
}

function Empty({ text }: Readonly<{ text: string }>) {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
      {text}
    </Typography>
  );
}

interface CountProps {
  rows: readonly CountRow[];
  /** The series name, read in the tooltip. */
  seriesLabel: string;
  /** What the chart shows, with its numbers, for screen readers. */
  summary: string;
  emptyText: string;
  /** Long category names read better as horizontal bars. */
  horizontal?: boolean;
}

/** Lead counts per category (a score bucket, a classification), one theme colour. */
export function CountBarChart({ rows, seriesLabel, summary, emptyText, horizontal = false }: Readonly<CountProps>) {
  const theme = useTheme();
  const data = useMemo(
    () => ({
      labels: rows.map((row) => row.label),
      datasets: [{ label: seriesLabel, data: rows.map((row) => row.count), backgroundColor: chartSeriesColor(theme, 0), borderRadius: 4, maxBarThickness: 32 }],
    }),
    [rows, seriesLabel, theme]
  );
  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: chartTooltip(theme) },
      scales: horizontal
        ? { x: valueAxis(theme, plain), y: categoryAxis(theme, rows.length) }
        : { x: categoryAxis(theme, rows.length), y: valueAxis(theme, plain) },
    }),
    [horizontal, rows.length, theme]
  );
  if (rows.every((row) => row.count === 0)) return <Empty text={emptyText} />;
  return (
    <ChartFrame>
      <Bar data={data} options={options} role="img" aria-label={summary} />
    </ChartFrame>
  );
}

interface TrendProps {
  rows: readonly TrendRow[];
  summary: string;
  emptyText: string;
}

/** The average score of the leads created each week, on a 0-100 axis; the week's lead count is in the tooltip. */
export function ScoreTrendChart({ rows, summary, emptyText }: Readonly<TrendProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const data = useMemo(
    () => ({
      labels: rows.map((row) => formatWeek(row.week)),
      datasets: [{ label: t('crm.leadQualityAnalytics.averageScore'), data: rows.map((row) => row.average_score ?? null), ...lineTrendDataset(theme, 0, true) }],
    }),
    [rows, t, theme]
  );
  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = lineTrendOptions(theme, true);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...chartTooltip(theme),
          callbacks: { afterLabel: (item: TooltipItem<'line'>) => t('crm.leadQualityAnalytics.leadsCount', { count: rows[item.dataIndex]?.leads ?? 0 }) },
        },
      },
      scales: { x: categoryAxis(theme), y: { ...valueAxis(theme, plain), max: 100 } },
    };
  }, [rows, t, theme]);
  if (rows.length === 0) return <Empty text={emptyText} />;
  return (
    <ChartFrame>
      <Line data={data} options={options} role="img" aria-label={summary} />
    </ChartFrame>
  );
}
