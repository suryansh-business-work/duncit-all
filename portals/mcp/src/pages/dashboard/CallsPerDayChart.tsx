import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { categoryAxis, chartSeriesColor, chartTooltip, SectionCard, valueAxis } from '@duncit/ui';
import { formatCount } from '../../lib/format';
import type { ChartDay } from './usageDays';

// Chart.js keeps one global registry; this is everything a bar chart with a legend draws.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/** Calls beside errors, one pair of bars per day of the window. */
export default function CallsPerDayChart({ days }: Readonly<{ days: readonly ChartDay[] }>) {
  const { t, locale } = useTranslation();
  const { formatDay } = useDateFormat();
  const theme = useTheme();
  const total = days.reduce((sum, day) => sum + day.calls, 0);
  const data = useMemo(
    () => ({
      labels: days.map((day) => formatDay(day.day)),
      datasets: [
        {
          label: t('mcp.dashboard.seriesCalls'),
          data: days.map((day) => day.calls),
          backgroundColor: chartSeriesColor(theme, 0),
          borderRadius: 2,
        },
        {
          label: t('mcp.dashboard.seriesErrors'),
          data: days.map((day) => day.errors),
          backgroundColor: chartSeriesColor(theme, 1),
          borderRadius: 2,
        },
      ],
    }),
    [days, formatDay, t, theme],
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
        tooltip: chartTooltip(theme),
      },
      scales: {
        x: categoryAxis(theme),
        y: valueAxis(theme, (value) => formatCount(value, locale)),
      },
    }),
    [theme, locale],
  );
  const first = days[0]?.day ?? '';
  const last = days.at(-1)?.day ?? '';
  const summary = t('mcp.dashboard.chartSummary', {
    vars: { calls: formatCount(total, locale), from: formatDay(first), to: formatDay(last) },
  });

  return (
    <SectionCard title={t('mcp.dashboard.chartTitle')}>
      <Box sx={{ height: 260, position: 'relative' }} data-testid="mcp-calls-chart">
        <Bar data={data} options={options} role="img" aria-label={summary} />
      </Box>
    </SectionCard>
  );
}
