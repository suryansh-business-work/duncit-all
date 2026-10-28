import type { ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format, parse } from 'date-fns';
import ChartCard, { chartTooltip } from './ChartCard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/** One bar series: its legend label, how to read it off a bucket, and its colour. */
export interface MonthlySeries<B> {
  label: string;
  value: (bucket: B) => number;
  color: string;
}

interface Props<B extends { month: string }> {
  title: ReactNode;
  /** One line under the title saying what is being compared. */
  caption?: string;
  /** Accessible name of the chart image. */
  ariaLabel: string;
  buckets: B[];
  series: MonthlySeries<B>[];
  loading: boolean;
  /** Shown when every bucket is zero. */
  emptyText: string;
}

/** 'YYYY-MM' -> 'Mar 26'. The server sends the key, never an English label. */
const monthLabel = (month: string): string => format(parse(month, 'yyyy-MM', new Date()), 'MMM yy');

/**
 * Month-by-month bars for the Loyalty dashboards — coins earned vs redeemed,
 * cards sold vs redeemed, coins printed vs redeemed. One chart, so every
 * dashboard reads the same way and themes the same way.
 */
export default function MonthlyBarChart<B extends { month: string }>({
  title,
  caption,
  ariaLabel,
  buckets,
  series,
  loading,
  emptyText,
}: Readonly<Props<B>>) {
  const theme = useTheme();
  const hasData = buckets.some((b) => series.some((s) => s.value(b) > 0));

  const data = {
    labels: buckets.map((b) => monthLabel(b.month)),
    datasets: series.map((s) => ({
      label: s.label,
      data: buckets.map(s.value),
      backgroundColor: s.color,
      borderRadius: 6,
      maxBarThickness: 22,
    })),
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: theme.palette.text.secondary } },
      tooltip: chartTooltip(theme),
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.palette.text.secondary } },
      y: {
        beginAtZero: true,
        grid: { color: theme.palette.divider },
        ticks: { color: theme.palette.text.secondary, precision: 0 },
      },
    },
  };

  return (
    <ChartCard title={title} caption={caption} height={300} hasData={hasData} loading={loading} emptyText={emptyText}>
      <Bar data={data} options={options} role="img" aria-label={ariaLabel} />
    </ChartCard>
  );
}
