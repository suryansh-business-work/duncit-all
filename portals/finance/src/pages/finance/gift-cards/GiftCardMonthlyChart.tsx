import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
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
import { useTranslation } from '@duncit/app-settings';
import type { GiftCardMonthBucket } from './queries';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  buckets: GiftCardMonthBucket[];
  loading: boolean;
}

/** 'YYYY-MM' -> 'Mar 26'. The server sends the key, never an English label. */
const monthLabel = (month: string): string =>
  format(parse(month, 'yyyy-MM', new Date()), 'MMM yy');

export default function GiftCardMonthlyChart({ buckets, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasData = buckets.some((b) => b.sold > 0 || b.redeemed > 0);

  const data = {
    labels: buckets.map((b) => monthLabel(b.month)),
    datasets: [
      {
        label: t('finance.giftCards.chartSold'),
        data: buckets.map((b) => b.sold),
        backgroundColor: '#2563eb',
        borderRadius: 6,
        maxBarThickness: 22,
      },
      {
        label: t('finance.giftCards.chartRedeemed'),
        data: buckets.map((b) => b.redeemed),
        backgroundColor: '#d97706',
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: theme.palette.text.secondary } },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
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

  // Computed above the JSX so the empty state never nests a ternary.
  let fallback = (
    <Typography
      sx={{
        color: "text.secondary",
        pt: 4
      }}>
      {t('finance.giftCards.logsEmpty')}
    </Typography>
  );
  if (loading) fallback = <CircularProgress sx={{ mt: 4 }} />;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {t('finance.giftCards.monthlyTitle')}
        </Typography>
        <Box sx={{ height: 300, mt: 2 }}>
          {hasData ? <Bar data={data} options={options} /> : fallback}
        </Box>
      </CardContent>
    </Card>
  );
}
