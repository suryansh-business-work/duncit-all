import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { ONBOARDING_STATUSES, type StatusCounts } from './onboardingStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af',
  SUBMITTED: '#2563eb',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
};

interface Props {
  title: string;
  counts: StatusCounts;
}

export default function StatusBreakdownChart({ title, counts }: Readonly<Props>) {
  const theme = useTheme();
  const total = ONBOARDING_STATUSES.reduce((acc, key) => acc + counts[key], 0);

  if (!total) {
    return <Typography color="text.secondary">No {title.toLowerCase()} data yet.</Typography>;
  }

  const data = {
    labels: [...ONBOARDING_STATUSES],
    datasets: [
      {
        data: ONBOARDING_STATUSES.map((key) => counts[key]),
        backgroundColor: ONBOARDING_STATUSES.map((key) => STATUS_COLORS[key]),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: theme.palette.text.secondary,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
        },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
