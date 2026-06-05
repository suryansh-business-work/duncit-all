import { Box, Stack, Typography } from '@mui/material';
import { format, isSameDay, isToday } from 'date-fns';
import type { CalEvent } from './useCalendarEvents';
import EventPill from './EventPill';

interface Props {
  /** Days to render as rows (e.g. one for Day view, 7 for Week). */
  days: Date[];
  events: CalEvent[];
  onEvent: (e: CalEvent) => void;
  emptyHint?: string;
}

/** Day-grouped event list — used by Day, Week, Upcoming and Year (agenda) views. */
export default function CalendarList({ days, events, onEvent, emptyHint }: Props) {
  const rows = days
    .map((day) => ({ day, items: events.filter((e) => isSameDay(e.date, day)) }))
    .filter((r) => r.items.length > 0);

  if (rows.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{emptyHint ?? 'Nothing scheduled.'}</Typography>;
  }

  return (
    <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
      {rows.map(({ day, items }) => (
        <Stack key={day.toISOString()} direction="row" spacing={1.5} sx={{ py: 1 }}>
          <Box sx={{ width: 120, flexShrink: 0 }}>
            <Typography variant="body2" fontWeight={isToday(day) ? 800 : 700} color={isToday(day) ? 'primary.main' : 'text.primary'}>
              {format(day, 'EEE, dd MMM')}
            </Typography>
            <Typography variant="caption" color="text.secondary">{format(day, 'yyyy')}</Typography>
          </Box>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            {items.map((e) => <EventPill key={e.id} event={e} onClick={onEvent} showTime />)}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
