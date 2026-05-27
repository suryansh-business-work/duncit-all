import { useMemo } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  RadialLinearScale,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import type { ServiceCount } from './dashboardConfig';

ChartJS.register(ArcElement, RadialLinearScale, ChartTooltip, Legend);

interface Props {
  data: ServiceCount[];
  title?: string;
}

// Cycles a palette across services so common labels get the same colour
// even when the dataset reshuffles between renders.
function buildPalette(theme: Theme) {
  return [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    '#a855f7',
    '#14b8a6',
    '#f97316',
    '#06b6d4',
    '#ec4899',
    '#84cc16',
    '#0ea5e9',
    '#facc15',
    '#22c55e',
  ];
}

export default function ServicesChart({ data, title = 'Services Mix' }: Props) {
  const theme = useTheme();
  const palette = useMemo(() => buildPalette(theme), [theme]);

  const chartData = useMemo(
    () => ({
      labels: data.map((s) => s.label),
      datasets: [
        {
          label: 'Lead rows',
          data: data.map((s) => s.count),
          backgroundColor: data.map((_, i) => `${palette[i % palette.length]}cc`),
          borderColor: theme.palette.background.paper,
          borderWidth: 2,
        },
      ],
    }),
    [data, palette, theme.palette.background.paper]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 10,
            color: theme.palette.text.secondary,
            font: { size: 11 },
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: { color: theme.palette.text.secondary, backdropColor: 'transparent', precision: 0 },
          grid: { color: theme.palette.divider },
          angleLines: { color: theme.palette.divider },
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
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Circular barplot of services offered across venue & host leads — each
            wedge length is the number of times a service appears.
          </Typography>
        </Stack>
        <div style={{ height: 320, width: '100%' }}>
          {data.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                No services tagged on any lead yet.
              </Typography>
            </Stack>
          ) : (
            <PolarArea data={chartData} options={options} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
