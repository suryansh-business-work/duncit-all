import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface ActivityEvent {
  id: string;
  event_type: string;
  path: string;
  title: string;
  target_text?: string;
  target_label?: string;
  occurred_at: string;
}

interface Props {
  events: ActivityEvent[];
}

const pageLabel = (event: ActivityEvent) => event.title || event.path || 'Untitled page';
const eventLabel = (event: ActivityEvent) => event.target_label || event.target_text || pageLabel(event);

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function actionColor(action: string): 'success' | 'info' | 'warning' | 'default' {
  if (action === 'CLICK') return 'success';
  if (action === 'TOUCH') return 'warning';
  if (action === 'PAGE_VIEW') return 'info';
  return 'default';
}

export default function ActivityJourneyChart({ events }: Props) {
  const theme = useTheme();
  const { hourly, topPages, steps } = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, '0')}:00`,
      count: 0,
    }));
    const pageCounts = new Map<string, number>();
    const pathSteps: ActivityEvent[] = [];

    events.forEach((event, index) => {
      const hour = new Date(event.occurred_at).getHours();
      if (hours[hour]) hours[hour].count += 1;
      const page = pageLabel(event);
      pageCounts.set(page, (pageCounts.get(page) ?? 0) + 1);
      const previous = events[index - 1];
      if (!previous || pageLabel(previous) !== page || event.event_type === 'CLICK') {
        pathSteps.push(event);
      }
    });

    return {
      hourly: hours,
      topPages: Array.from(pageCounts.entries())
        .map(([page, count]) => ({ page, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
      steps: pathSteps.slice(0, 12),
    };
  }, [events]);

  const maxPageCount = Math.max(1, ...topPages.map((page) => page.count));
  const chartData = {
    labels: hourly.map((item) => item.label),
    datasets: [
      {
        label: 'Events',
        data: hourly.map((item) => item.count),
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.14),
        pointBackgroundColor: theme.palette.primary.main,
        pointRadius: 3,
        tension: 0.35,
        fill: true,
      },
    ],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.palette.text.secondary, maxRotation: 0 } },
      y: { beginAtZero: true, ticks: { color: theme.palette.text.secondary, precision: 0 }, grid: { color: theme.palette.divider } },
    },
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Activity over the day</Typography>
          <Box sx={{ height: 190 }}>
            <Line data={chartData} options={options} />
          </Box>
        </Box>
        <Box sx={{ width: { xs: '100%', md: 260 }, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Top pages</Typography>
          <Stack spacing={1}>
            {topPages.map((item) => (
              <Box key={item.page}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" noWrap>{item.page}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.count}</Typography>
                </Stack>
                <Box sx={{ height: 6, borderRadius: 999, bgcolor: 'action.hover', mt: 0.4 }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.round((item.count / maxPageCount) * 100)}%`,
                      borderRadius: 999,
                      bgcolor: 'primary.main',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="stretch" sx={{ minWidth: 'max-content' }}>
          {steps.map((event, index) => (
            <Stack key={event.id} direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 190,
                  minHeight: 92,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary">{formatTime(event.occurred_at)}</Typography>
                  <Chip size="small" color={actionColor(event.event_type)} label={event.event_type} />
                </Stack>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ mt: 0.75 }}>{pageLabel(event)}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{eventLabel(event)}</Typography>
              </Box>
              {index < steps.length - 1 && (
                <Box sx={{ width: 28, height: 2, bgcolor: 'divider', borderRadius: 999 }} />
              )}
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}