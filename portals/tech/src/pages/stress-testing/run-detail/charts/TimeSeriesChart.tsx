import { useMemo } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { seriesColor } from './chartSetup';

export interface ChartSeries {
  id: string;
  label: string;
  /** A null is a missing reading — drawn as a gap, never as zero. */
  values: Array<number | null>;
}

interface Props {
  title: string;
  subtitle?: string;
  /** Elapsed-time labels, one per sample. */
  labels: string[];
  /** At most three — see chartSetup. Every series shares ONE unit and one axis. */
  series: readonly ChartSeries[];
  format: (value: number) => string;
  emptyText: string;
}

/**
 * One measure over the run's timeline. Lines at 2px with no point markers until
 * hover; a crosshair tooltip lists every series at that moment. A single series
 * carries no legend — the title names it.
 */
export default function TimeSeriesChart({ title, subtitle, labels, series, format, emptyText }: Readonly<Props>) {
  const theme = useTheme();
  const data = useMemo(
    () => ({
      labels,
      datasets: series.slice(0, 3).map((s, index) => ({
        label: s.label,
        data: s.values,
        borderColor: seriesColor(theme, index),
        backgroundColor: seriesColor(theme, index),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 12,
        tension: 0.25,
      })),
    }),
    [labels, series, theme]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: series.length > 1,
          position: 'top',
          align: 'start',
          labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.primary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label ?? ''}: ${format(Number(ctx.parsed.y ?? 0))}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 8, autoSkip: true, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.palette.divider },
          border: { display: false },
          ticks: { color: theme.palette.text.secondary, maxTicksLimit: 5, callback: (value) => format(Number(value)) },
        },
      },
    }),
    [format, series.length, theme]
  );

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={0.25} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Stack>
        <Box sx={{ height: 220, position: 'relative' }}>
          {labels.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', pt: 8, textAlign: 'center' }}>
              {emptyText}
            </Typography>
          ) : (
            <Line data={data} options={options} aria-label={title} role="img" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
