import { useMemo } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { SuperCategoryCount } from './dashboardConfig';
import { useTranslation } from '@duncit/shell';

ChartJS.register(BarElement, CategoryScale, LinearScale, ChartTooltip, Legend);

interface Props {
  data: SuperCategoryCount[];
  title?: string;
}

/**
 * Per-super-category breakdown of Venue vs Host leads. Mirrors `StageChart`
 * visually so the dashboard reads consistently — uses the admin-managed
 * SUPER category list as the X axis.
 */
export default function SuperCategoryChart({ data, title }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleText = title ?? t('crm.dashboard.leadsBySuperCategory');

  const theme = useTheme();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: t('crm.common.venue'),
          data: data.map((d) => d.venue),
          backgroundColor: theme.palette.primary.main,
          borderRadius: 6,
          maxBarThickness: 28,
        },
        {
          label: t('crm.common.host'),
          data: data.map((d) => d.host),
          backgroundColor: theme.palette.info.main,
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    }),
    [data, theme.palette]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { boxWidth: 12, boxHeight: 12, padding: 14, color: theme.palette.text.secondary },
        },
        tooltip: { mode: 'index' as const, intersect: false },
      },
      scales: {
        x: {
          stacked: false,
          grid: { display: false },
          ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          ticks: { color: theme.palette.text.secondary, font: { size: 11 }, precision: 0 },
          grid: { color: theme.palette.divider },
        },
      },
    }),
    [theme.palette]
  );

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {titleText}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Venue and host leads grouped by the super category they were
            registered under (catalogue managed via Admin).
          </Typography>
        </Stack>
        <div style={{ height: 300, width: '100%' }}>
          {data.length === 0 ? (
            <Stack
              sx={{
                alignItems: "center",
                justifyContent: "center",
                height: '100%'
              }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                No super categories yet — add some from the Admin portal.
              </Typography>
            </Stack>
          ) : (
            <Bar data={chartData} options={options} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
