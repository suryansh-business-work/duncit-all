import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthPoint } from './insights';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  points: MonthPoint[];
  currency?: string;
}

export default function PodsTrendChart({ points, currency = '₹' }: Readonly<Props>) {
  const theme = useTheme();
  const hasData = points.some((point) => point.earning > 0 || point.pods > 0);
  if (!hasData) {
    return <Typography color="text.secondary">No pod activity in this period yet.</Typography>;
  }

  const data = {
    labels: points.map((point) => point.label),
    datasets: [
      {
        label: 'Pod earnings',
        data: points.map((point) => point.earning),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        maxBarThickness: 26,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'bar'>) =>
            `${currency}${Number(item.raw ?? 0).toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.palette.text.secondary } },
      y: {
        beginAtZero: true,
        ticks: { color: theme.palette.text.secondary },
        grid: { color: theme.palette.divider },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
