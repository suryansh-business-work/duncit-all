import '../../charts/setup';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import { Bar, Line } from 'react-chartjs-2';
import { formatUptime } from '../../utils/format';
import type { DailyUptime, HistoryPoint, HistoryResponse } from '../../types';

function uptimeBarColor(uptime: number | null, theme: Theme): string {
  if (uptime === null) return theme.palette.action.disabledBackground;
  if (uptime >= 99.9) return theme.palette.success.main;
  if (uptime >= 95) return theme.palette.warning.main;
  return theme.palette.error.main;
}

const axisOptions = (theme: Theme) => ({
  ticks: { color: theme.palette.text.secondary, maxTicksLimit: 8 },
  grid: { color: theme.palette.divider },
});

function UptimeBar({ daily }: Readonly<{ daily: DailyUptime[] }>) {
  const theme = useTheme();
  const data = {
    labels: daily.map((day) => day.date.slice(5)),
    datasets: [
      {
        label: 'Uptime %',
        data: daily.map((day) => day.uptime),
        backgroundColor: daily.map((day) => uptimeBarColor(day.uptime, theme)),
        borderRadius: 2,
        maxBarThickness: 10,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item: { raw: unknown }) => `Uptime ${formatUptime(Number(item.raw ?? 0))}`,
        },
      },
    },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: { min: 0, max: 100, ...axisOptions(theme) },
    },
  };
  return (
    <Box height={130}>
      <Bar data={data} options={options} />
    </Box>
  );
}

function LatencyLine({ points }: Readonly<{ points: HistoryPoint[] }>) {
  const theme = useTheme();
  const data = {
    labels: points.map((point) =>
      new Date(point.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ),
    datasets: [
      {
        label: 'Latency (ms)',
        data: points.map((point) => point.latency_ms),
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ...axisOptions(theme), grid: { display: false } },
      y: { beginAtZero: true, ...axisOptions(theme) },
    },
  };
  return (
    <Box height={150}>
      <Line data={data} options={options} />
    </Box>
  );
}

interface HistoryChartsProps {
  history: HistoryResponse | null;
  failed: boolean;
}

export default function HistoryCharts({ history, failed }: Readonly<HistoryChartsProps>) {
  if (failed) {
    return (
      <Alert severity="warning" variant="outlined">
        History is unavailable right now.
      </Alert>
    );
  }
  if (!history) return <Skeleton variant="rounded" height={140} />;

  const hasDaily = history.daily.length > 0;
  const hasLatency = history.points.some((point) => point.latency_ms !== null);
  if (!hasDaily && !hasLatency) {
    return (
      <Typography variant="body2" color="text.secondary" py={1}>
        No history recorded yet — checks run every 5 minutes.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {hasDaily && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Daily uptime — last 90 days
          </Typography>
          <UptimeBar daily={history.daily} />
        </Box>
      )}
      {hasLatency ? (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Latency — last 24 hours
          </Typography>
          <LatencyLine points={history.points} />
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          No latency samples in the last 24 hours.
        </Typography>
      )}
    </Stack>
  );
}
