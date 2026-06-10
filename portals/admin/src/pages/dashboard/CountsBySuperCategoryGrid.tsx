import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Counts {
  super_category_slug: string | null;
  super_category_name: string | null;
  count: number;
}

interface Props {
  title: string;
  counts: Counts[];
  total: number;
  color?: string;
}

export default function CountsBySuperCategoryGrid({ title, counts, total, color = '#FF4D4F' }: Readonly<Props>) {
  const theme = useTheme();
  const palette = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
  const labels = counts.map((c) => c.super_category_name || c.super_category_slug || 'Uncategorised');
  const values = counts.map((c) => c.count);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="overline" color="text.secondary">
            Total {total}
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          <Box sx={{ height: 220, flex: '0 0 280px', minWidth: 0 }}>
            <Doughnut
              data={{
                labels,
                datasets: [
                  {
                    data: values,
                    backgroundColor: labels.map((_label, index) => palette[index % palette.length]),
                    borderColor: theme.palette.background.paper,
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
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
              }}
            />
          </Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              overflowX: 'auto',
              pb: 1,
              flex: 1,
              alignItems: 'center',
              '&::-webkit-scrollbar': { height: 6 },
            }}
          >
          {counts.length === 0 && (
            <Typography color="text.secondary">No super categories yet.</Typography>
          )}
          {counts.map((c, index) => (
            <Card
              key={c.super_category_slug || 'unknown'}
              variant="outlined"
              sx={{
                minWidth: 160,
                borderLeft: `4px solid ${palette[index % palette.length] || color}`,
                flexShrink: 0,
              }}
            >
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {c.super_category_name || c.super_category_slug || 'Uncategorised'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: palette[index % palette.length] || color }}>
                  {c.count}
                </Typography>
              </CardContent>
            </Card>
          ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
