import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const STATUS_COLORS: Record<string, string> = {
  NEW: '#2563eb',
  IN_PROGRESS: '#d97706',
  RESOLVED: '#0f766e',
  ARCHIVED: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  ARCHIVED: 'Archived',
};

interface StatusCount {
  status: string;
  count: number;
}

interface Props {
  buckets: StatusCount[];
  total: number;
  open: number;
}

export default function SupportTicketsChart({ buckets, total, open }: Props) {
  const theme = useTheme();
  const labels = buckets.map((b) => STATUS_LABELS[b.status] || b.status);
  const data = {
    labels,
    datasets: [
      {
        label: 'Tickets',
        data: buckets.map((b) => b.count),
        backgroundColor: buckets.map((b) => STATUS_COLORS[b.status] || '#94a3b8'),
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: theme.palette.text.secondary },
        grid: { color: theme.palette.divider },
      },
    },
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Support tickets by status
          </Typography>
          <Typography variant="overline" color="text.secondary">
            {total} total · {open} open
          </Typography>
        </Stack>
        <Box sx={{ height: 240 }}>
          {total === 0 ? (
            <Typography color="text.secondary">No support tickets yet.</Typography>
          ) : (
            <Bar data={data} options={options} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
