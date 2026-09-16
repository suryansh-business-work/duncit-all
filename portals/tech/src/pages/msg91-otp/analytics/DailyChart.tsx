import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarElement, Chart as ChartJS, type ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatDay, useTranslation } from '@duncit/app-settings';
import SectionCard from '../../stress-testing/components/SectionCard';
import { seriesColor } from '../../stress-testing/run-detail/charts/chartSetup';
import type { Msg91WidgetDay } from '../queries';

// The shared setup registers the scales, tooltip and legend; a bar needs its own element.
ChartJS.register(BarElement);

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
          backgroundColor: seriesColor(theme, 0),
          borderRadius: 2,
        },
        {
          label: t('tech.msg91.seriesVerified'),
          data: days.map((day) => day.verified),
          backgroundColor: seriesColor(theme, 2),
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
