import '../charts/setup';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import { dayStateColor } from '../utils/status';
import { formatUptime } from '../utils/format';
import type { GlobalDaily } from '../types';

function buildData(global: GlobalDaily[], theme: Theme) {
  return {
    labels: global.map((day) => day.date.slice(5)),
    datasets: [
      {
        label: 'Overall uptime %',
        data: global.map((day) => day.uptime),
        backgroundColor: global.map((day) => dayStateColor(day.state, theme)),
        borderRadius: 2,
        maxBarThickness: 8,
      },
    ],
  };
}

function buildOptions(theme: Theme, global: GlobalDaily[]) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: Array<{ dataIndex: number }>) => global[items[0]?.dataIndex]?.date ?? '',
          label: (item: { dataIndex: number; raw: unknown }) => {
            const day = global[item.dataIndex];
            const suffix = day ? ` · ${day.operational}/${day.total} operational` : '';
            return `${formatUptime(Number(item.raw ?? 0))}${suffix}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: {
        min: 90,
        max: 100,
        ticks: { color: theme.palette.text.secondary, maxTicksLimit: 5, callback: (v: number | string) => `${v}%` },
        grid: { color: theme.palette.divider },
      },
    },
  };
}

interface GlobalChartProps {
  global: GlobalDaily[] | undefined;
  overallUptime: number | null | undefined;
}

export default function GlobalUptimeChart({ global, overallUptime }: Readonly<GlobalChartProps>) {
  const theme = useTheme();
  if (!global || global.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap={1}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
          Overall uptime — last 90 days
        </Typography>
        <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatUptime(overallUptime)}
        </Typography>
      </Stack>
      <Box height={120} mt={1}>
        <Bar data={buildData(global, theme)} options={buildOptions(theme, global)} />
      </Box>
    </Paper>
  );
}
