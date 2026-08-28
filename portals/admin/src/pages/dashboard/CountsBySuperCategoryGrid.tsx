import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
// The surrounding Card, title and "Total N" now come from the dashboard widget
// this renders inside (@duncit/dashboard) — only the chart and the per-category
// tiles live here.
import { useTheme } from '@mui/material/styles';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTranslation } from '@duncit/shell';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Counts {
  super_category_slug: string | null;
  super_category_name: string | null;
  count: number;
}

interface Props {
  counts: Counts[];
  color?: string;
}

export default function CountsBySuperCategoryGrid({ counts, color = '#FF4D4F' }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const palette = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
  const labels = counts.map((c) => c.super_category_name || c.super_category_slug || 'Uncategorised');
  const values = counts.map((c) => c.count);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
      alignItems: "stretch"
    }}>
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
        <Typography sx={{
          color: "text.secondary"
        }}>{t('admin.dashboard.noSuperCategories')}</Typography>
      )}
      {counts.map((c, index) => (
        <Card
          key={c.super_category_slug || 'unknown'}
          variant="outlined"
          sx={{
            minWidth: 160,
            // `color` (the caller's per-grid accent — pods red, clubs blue)
            // never actually applies: `palette` is a fixed 6-entry array of
            // non-empty hex strings, so `palette[i % 6]` can never be falsy
            // and this fallback can never be taken. Left as-is pending a
            // design call on whether the rotating palette or the caller's
            // accent is the intended look.
            /* v8 ignore next -- unreachable, see the comment above */
            borderLeft: `4px solid ${palette[index % palette.length] || color}`,
            flexShrink: 0,
          }}
        >
          <CardContent>
            <Typography variant="overline" sx={{
              color: "text.secondary"
            }}>
              {c.super_category_name || c.super_category_slug || 'Uncategorised'}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                /* v8 ignore next -- unreachable, same as the borderLeft above */
                color: palette[index % palette.length] || color
              }}>
              {c.count}
            </Typography>
          </CardContent>
        </Card>
      ))}
      </Stack>
    </Stack>
  );
}
