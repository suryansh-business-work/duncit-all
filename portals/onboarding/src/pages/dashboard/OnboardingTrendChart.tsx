import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthBucket } from './onboardingStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  buckets: MonthBucket[];
}

export default function OnboardingTrendChart({ buckets }: Readonly<Props>) {
  const theme = useTheme();
  const hasData = buckets.some((bucket) => bucket.hosts > 0 || bucket.venues > 0);

  if (!hasData) {
    return <Typography color="text.secondary">No submissions in this period yet.</Typography>;
  }

  const data = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: 'Hosts',
        data: buckets.map((bucket) => bucket.hosts),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        maxBarThickness: 22,
      },
      {
        label: 'Venues',
        data: buckets.map((bucket) => bucket.venues),
        backgroundColor: '#0f766e',
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: theme.palette.text.secondary,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.palette.text.secondary } },
      y: {
        beginAtZero: true,
        ticks: { color: theme.palette.text.secondary, precision: 0 },
        grid: { color: theme.palette.divider },
      },
    },
  };

  return (
    <div style={{ height: 280 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
