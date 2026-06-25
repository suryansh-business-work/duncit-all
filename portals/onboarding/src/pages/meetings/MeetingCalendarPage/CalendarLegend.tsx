import { Box, Stack, Typography } from '@mui/material';
import { ALL_DISPLAY_STATUSES, statusMeta } from '../calendarColors';

/** Compact colour key for the calendar's meeting statuses. */
export default function CalendarLegend() {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
      {ALL_DISPLAY_STATUSES.map((s) => {
        const meta = statusMeta(s);
        return (
          <Stack key={s} direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: meta.color }} />
            <Typography variant="caption" color="text.secondary">{meta.label}</Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
