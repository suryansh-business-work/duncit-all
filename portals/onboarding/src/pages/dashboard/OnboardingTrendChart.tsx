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
import { useTranslation } from '@duncit/app-settings';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TrendField = Exclude<keyof MonthBucket, 'label'>;

/** The bars, in draw order. `labelKey` is the localization key for the legend. */
const SERIES: { field: TrendField; labelKey: string; color: string }[] = [
  { field: 'hosts', labelKey: 'onboarding.common.hosts', color: '#6366f1' },
  { field: 'venues', labelKey: 'shell.nav.venues', color: '#0f766e' },
  { field: 'brands', labelKey: 'shell.nav.brands', color: '#d97706' },
  { field: 'club_admins', labelKey: 'onboarding.dashboard.clubAdmins', color: '#9333ea' },
];

interface Props {
  buckets: MonthBucket[];
  /** E-commerce is behind a system flag; with it off the brand bar is dropped. */
  showBrands: boolean;
}

export default function OnboardingTrendChart({ buckets, showBrands }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const series = showBrands ? SERIES : SERIES.filter((entry) => entry.field !== 'brands');
  const hasData = buckets.some((bucket) => series.some((entry) => bucket[entry.field] > 0));

  if (!hasData) {
    return (
      <Typography sx={{
        color: "text.secondary"
      }}>{t('onboarding.dashboard.noSubmissionsInThisPeriodYet')}</Typography>
    );
  }

  const data = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: series.map((entry) => ({
      label: t(entry.labelKey),
      data: buckets.map((bucket) => bucket[entry.field]),
      backgroundColor: entry.color,
      borderRadius: 6,
      maxBarThickness: 22,
    })),
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

  // The canvas has no text of its own (1.1.1): name it with each series' total.
  const summary = series
    .map((entry) => {
      const total = buckets.reduce((sum, bucket) => sum + bucket[entry.field], 0);
      return `${t(entry.labelKey)} ${total}`;
    })
    .join(', ');

  return (
    <div
      role="img"
      aria-label={`${t('onboarding.dashboard.onboardingTrendLast6Months')}: ${summary}`}
      data-testid="onboarding-trend-chart"
      style={{ height: 280 }}
    >
      <Bar data={data} options={options} />
    </div>
  );
}
