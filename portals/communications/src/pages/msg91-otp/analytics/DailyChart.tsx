import { useMemo } from 'react';
import { Box } from '@mui/material';
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
import { formatDay, useTranslation } from '@duncit/app-settings';
import { SectionCard, chartSeriesColor } from '@duncit/ui';
import type { Msg91WidgetDay } from '../queries';

// Chart.js keeps one global registry; this is everything a bar chart with a legend draws.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/** Requests beside verifications, one pair of bars per day of the window. */
export default function DailyChart({ days }: Readonly<{ days: readonly Msg91WidgetDay[] }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const data = useMemo(
    () => ({
      labels: days.map((day) => formatDay(day.date)),
      datasets: [
        {
          label: t('tech.msg91.seriesRequests'),
          data: days.map((day) => day.total),
          backgroundColor: chartSeriesColor(theme, 0),
          borderRadius: 2,
        },
        {
          label: t('tech.msg91.seriesVerified'),
          data: days.map((day) => day.verified),
          backgroundColor: chartSeriesColor(theme, 2),
          borderRadius: 2,
        },
      ],
    }),
    [days, t, theme]
  );
  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 12, autoSkip: true, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.palette.divider },
          border: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 5, precision: 0 },
        },
      },
    }),
    [theme]
  );

  return (
    <SectionCard title={t('tech.msg91.chartTitle')}>
      <Box sx={{ height: 260, position: 'relative' }} data-testid="msg91-daily-chart">
        <Bar data={data} options={options} aria-label={t('tech.msg91.chartTitle')} role="img" />
      </Box>
    </SectionCard>
  );
}
