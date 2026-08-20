import { Box, Card, Grid, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { HostInsights } from './queries';
import { formatDate } from '@duncit/app-settings';

const WIDTH = 640;
const HEIGHT = 180;
const PAD = 10;

type StatusKey = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type PaletteKey = 'info' | 'warning' | 'success' | 'error';

const STATUS: { key: StatusKey; label: string; palette: PaletteKey }[] = [
  { key: 'upcoming', label: 'Upcoming', palette: 'info' },
  { key: 'ongoing', label: 'Ongoing', palette: 'warning' },
  { key: 'completed', label: 'Completed', palette: 'success' },
  { key: 'cancelled', label: 'Cancelled', palette: 'error' },
];

/** "2026-08" -> "Aug 26" — the axis label under each bar. */
function monthLabel(bucket: string): string {
  const [year, month] = bucket.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return bucket;
  return formatDate(date);
}

/** Where each month's point sits on the earnings polyline. */
function earningsLine(totals: number[]): string {
  const span = Math.max(...totals, 0) || 1;
  const step = totals.length > 1 ? WIDTH / (totals.length - 1) : 0;
  return totals
    .map((total, index) => {
      const x = index * step;
      const y = HEIGHT - PAD - (total / span) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface Props {
  insights: HostInsights | null;
  currencySymbol: string;
}

/**
 * The two questions a host asks of their history: how their pods ended, and
 * what they earned month by month.
 *
 * Drawn as inline SVG + progress bars rather than a chart library, matching the
 * Club Admin dashboard next door — one fewer runtime dependency, and it themes
 * itself from the palette in both light and dark.
 */
export default function HostInsightsCharts({ insights, currencySymbol }: Readonly<Props>) {
  const theme = useTheme();
  const counts = insights?.status_counts;
  const months = insights?.monthly_earnings ?? [];
  const totalPods = counts
    ? counts.upcoming + counts.ongoing + counts.completed + counts.cancelled
    : 0;
  const totals = months.map((month) => month.total);
  const hasTrend = months.length >= 2;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={900}>
              Pods by status
            </Typography>
            {totalPods === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pods yet. Once you host one it appears here.
              </Typography>
            ) : (
              STATUS.map((status) => {
                const value = counts?.[status.key] ?? 0;
                return (
                  <Stack key={status.key} spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" fontWeight={800}>
                        {status.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {value}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(value / totalPods) * 100}
                      color={status.palette}
                      sx={{ height: 8, borderRadius: 999 }}
                    />
                  </Stack>
                );
              })
            )}
          </Stack>
        </Card>
      </Grid>

      <Grid item xs={12} md={7}>
        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={900}>
              Monthly earnings
            </Typography>
            {hasTrend ? (
              <>
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <svg
                    width="100%"
                    height={HEIGHT}
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Monthly host earnings"
                  >
                    <polyline
                      points={earningsLine(totals)}
                      fill="none"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Box>
                <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
                  {months.map((month) => (
                    <Typography key={month.month} variant="caption" color="text.secondary">
                      {monthLabel(month.month)}
                    </Typography>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Peak month:{' '}
                  {formatMoney(Math.max(...totals, 0), { symbol: currencySymbol })}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not enough completed pods to draw a trend yet.
              </Typography>
            )}
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );
}
