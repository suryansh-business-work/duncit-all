import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { ONBOARDING_STATUSES, type StatusCounts } from './onboardingStats';

ChartJS.register(ArcElement, Tooltip, Legend);

/** DRAFT has no entry: it takes the theme's secondary text colour, since the
 * old `#9ca3af` grey was 2.5:1 on the card — under the 3:1 graphics floor. */
const STATUS_COLORS: Partial<Record<string, string>> = {
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
    return (
      <Typography sx={{
        color: "text.secondary"
      }}>No {title.toLowerCase()} data yet.</Typography>
    );
  }

  const data = {
    labels: [...ONBOARDING_STATUSES],
    datasets: [
      {
        data: ONBOARDING_STATUSES.map((key) => counts[key]),
        backgroundColor: ONBOARDING_STATUSES.map(
          (key) => STATUS_COLORS[key] ?? theme.palette.text.secondary,
        ),
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

  // The canvas has no text of its own (1.1.1): name it with every count.
  const summary = ONBOARDING_STATUSES.map((key) => `${key} ${counts[key]}`).join(', ');

  return (
    <div role="img" aria-label={`${title}: ${summary}`} style={{ height: 260 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
