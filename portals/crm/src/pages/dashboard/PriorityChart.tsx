import { useMemo } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArcElement, Chart as ChartJS, Legend, Tooltip as ChartTooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, Legend);

interface Slice {
  label: string;
  count: number;
}

interface Props {
  slices: Slice[];
  title?: string;
}

export default function PriorityChart({ slices, title = 'Leads by Priority' }: Readonly<Props>) {
  const theme = useTheme();
  const palette = useMemo(
    () => [
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.primary.main,
      theme.palette.secondary.main,
    ],
    [theme.palette]
  );

  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.count),
          backgroundColor: slices.map((_, i) => palette[i % palette.length]),
          borderColor: theme.palette.background.paper,
          borderWidth: 2,
        },
      ],
    }),
    [slices, palette, theme.palette.background.paper]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 12, boxHeight: 12, padding: 12, color: theme.palette.text.secondary },
        },
        tooltip: { enabled: true },
      },
    }),
    [theme.palette.text.secondary]
  );

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Lead priority mix across venue and host pipelines.
          </Typography>
        </Stack>
        <div style={{ height: 280, width: '100%' }}>
          {slices.every((s) => s.count === 0) ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                No leads in the selected period.
              </Typography>
            </Stack>
          ) : (
            <Doughnut data={data} options={options} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
