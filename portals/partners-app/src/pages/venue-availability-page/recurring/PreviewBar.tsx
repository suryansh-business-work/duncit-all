import { Box, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { WEEKDAY_FULL } from './settings-map';
import type { PreviewSummary } from './recurring.types';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Props {
  summary: PreviewSummary;
  maxAdvanceDays: number;
}

export default function PreviewBar({ summary, maxAdvanceDays }: Readonly<Props>) {
  const days = Object.keys(summary.byWeekday)
    .map(Number)
    .sort((a, b) => a - b);

  const skips: string[] = [];
  if (summary.skippedWeeklyOff) skips.push(`${summary.skippedWeeklyOff} weekly-off`);
  if (summary.skippedHolidays) skips.push(`${summary.skippedHolidays} holiday`);
  if (summary.skippedPast) skips.push(`${summary.skippedPast} past`);
  if (summary.skippedBeyondCap) skips.push(`${summary.skippedBeyondCap} beyond ${maxAdvanceDays} days`);

  return (
    <Box
      aria-live="polite"
      sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EventAvailableIcon />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              Slots to be created
            </Typography>
            <Typography variant="h4" fontWeight={950} color="primary.main" sx={{ lineHeight: 1.05 }}>
              {summary.total} Slots
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2.5} flexWrap="wrap" rowGap={1}>
          {days.map((day) => (
            <Box key={day}>
              <Typography variant="caption" fontWeight={800}>
                {WEEKDAY_FULL[day]}
              </Typography>
              <Typography variant="body2" fontWeight={900}>
                {summary.byWeekday[day].count} Slots
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmt(summary.byWeekday[day].price)}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box sx={{ textAlign: { md: 'right' } }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Total revenue (est.)
          </Typography>
          <Typography variant="h5" fontWeight={950}>
            {fmt(summary.estimatedRevenue)}
          </Typography>
        </Box>
      </Stack>
      {skips.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Auto-skipped: {skips.join(' · ')}
        </Typography>
      )}
    </Box>
  );
}
