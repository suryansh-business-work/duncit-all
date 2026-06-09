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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Bucket {
  bucket: string;
  unique_devices: number;
  unique_users: number;
}

interface Props {
  buckets: Bucket[];
}

export default function ActiveUsersChart({ buckets }: Readonly<Props>) {
  const theme = useTheme();

  if (!buckets.length) {
    return <Typography color="text.secondary">No activity in this range yet.</Typography>;
  }

  const data = {
    labels: buckets.map((bucket) => bucket.bucket),
    datasets: [
      {
        label: 'Unique devices',
        data: buckets.map((bucket) => bucket.unique_devices),
        backgroundColor: '#2563eb',
        borderRadius: 6,
        maxBarThickness: 24,
      },
      {
        label: 'Logged-in users',
        data: buckets.map((bucket) => bucket.unique_users),
        backgroundColor: '#0f766e',
        borderRadius: 6,
        maxBarThickness: 24,
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
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          color: theme.palette.text.secondary,
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
      x: {
        grid: { display: false },
        ticks: { color: theme.palette.text.secondary, maxRotation: 0, autoSkip: true },
      },
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
