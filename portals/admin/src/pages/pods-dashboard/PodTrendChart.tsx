import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@duncit/shell';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  trend: Array<{ date: string; count: number }>;
  loading: boolean;
}

/** How many pods were created each day — is the supply growing or stalling? */
export default function PodTrendChart({ trend, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasData = trend.some((day) => day.count > 0);

  const data = {
    labels: trend.map((day) => format(parseISO(day.date), 'd MMM')),
    datasets: [
      {
        label: t('admin.podsDashboard.podsCreated'),
        data: trend.map((day) => day.count),
        backgroundColor: '#7c3aed',
        borderRadius: 6,
        maxBarThickness: 18,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        // A year of daily bars would print a wall of dates; the chart still
        // holds every day, the axis just names a handful of them.
        ticks: { color: theme.palette.text.secondary, maxTicksLimit: 12, autoSkip: true },
      },
      y: {
        beginAtZero: true,
        grid: { color: theme.palette.divider },
        ticks: { color: theme.palette.text.secondary, precision: 0 },
      },
    },
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {t('admin.podsDashboard.podsCreated')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          One bar per day, including the days nobody created anything.
        </Typography>
        <Box sx={{ height: 260, mt: 2 }}>
          {hasData ? (
            <Bar data={data} options={options} />
          ) : (
            <Typography color="text.secondary" sx={{ pt: 4 }}>
              {loading ? 'Loading pod activity…' : 'No pods were created in this period.'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
