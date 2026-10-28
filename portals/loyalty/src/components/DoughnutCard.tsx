import type { ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';
import { ArcElement, Chart as ChartJS, Legend, Tooltip, type ChartOptions } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ChartCard, { chartTooltip } from './ChartCard';

ChartJS.register(ArcElement, Tooltip, Legend);

/** One slice: its legend label, its value and its colour (a theme palette value). */
export interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: ReactNode;
  /** One line under the title saying what the parts add up to. */
  caption?: string;
  /** Accessible name of the chart image. */
  ariaLabel: string;
  slices: DoughnutSlice[];
  loading: boolean;
  /** Shown when every slice is zero. */
  emptyText: string;
  /** How a slice's value reads in the tooltip — coins, rupees or a count. */
  formatValue?: (value: number) => string;
}

/**
 * How a whole splits into its parts, for the Loyalty dashboards — where the
 * reward liability sits, how many referred members have paid.
 */
export default function DoughnutCard({ title, caption, ariaLabel, slices, loading, emptyText, formatValue }: Readonly<Props>) {
  const theme = useTheme();

  const data = {
    labels: slices.map((slice) => slice.label),
    datasets: [
      {
        data: slices.map((slice) => slice.value),
        backgroundColor: slices.map((slice) => slice.color),
        borderColor: theme.palette.background.paper,
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, color: theme.palette.text.secondary } },
      tooltip: {
        ...chartTooltip(theme),
        callbacks: formatValue ? { label: (item) => `${item.label}: ${formatValue(Number(item.raw))}` } : undefined,
      },
    },
  };

  return (
    <ChartCard
      title={title}
      caption={caption}
      height={260}
      hasData={slices.some((slice) => slice.value > 0)}
      loading={loading}
      emptyText={emptyText}
    >
      <Doughnut data={data} options={options} role="img" aria-label={ariaLabel} />
    </ChartCard>
  );
}
