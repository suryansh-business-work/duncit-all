import { Box, Stack, Typography } from '@mui/material';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { CalEvent } from './useCalendarEvents';
import EventPill from './EventPill';

interface Props {
  cursor: Date;
  events: CalEvent[];
  onEvent: (e: CalEvent) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Month grid (6 weeks). Each cell lists that day's events. */
export default function CalendarMonth({ cursor, events, onEvent }: Readonly<Props>) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {WEEKDAYS.map((d) => (
          <Typography key={d} variant="caption" color="text.secondary" sx={{ p: 0.5, fontWeight: 700, textAlign: 'center' }}>{d}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: 1, borderLeft: 1, borderColor: 'divider' }}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, day));
          const muted = !isSameMonth(day, cursor);
          const todayColor = isToday(day) ? 'primary.main' : 'text.primary';
          const labelColor = muted ? 'text.disabled' : todayColor;
          return (
            <Box key={day.toISOString()} sx={{ minHeight: 96, borderRight: 1, borderBottom: 1, borderColor: 'divider', p: 0.5, bgcolor: muted ? 'action.hover' : 'background.paper' }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday(day) ? 800 : 500,
                  color: labelColor,
                  display: 'inline-block',
                  mb: 0.25,
                }}
              >
                {format(day, 'd')}
              </Typography>
              <Stack spacing={0.25}>
                {dayEvents.slice(0, 3).map((e) => <EventPill key={e.id} event={e} onClick={onEvent} />)}
                {dayEvents.length > 3 && (
                  <Typography variant="caption" color="text.secondary">+{dayEvents.length - 3} more</Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
