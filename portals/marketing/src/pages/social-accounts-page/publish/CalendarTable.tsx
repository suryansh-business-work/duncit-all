import { Box, Typography } from '@mui/material';
import type { SocialCalendarItem } from '../publish.queries';
import CalendarDayCell from './CalendarDayCell';
import { weekdayNames } from './calendar-grid';

interface Props {
  title: string;
  /** Rows of day keys: a month's weeks, or the one week. */
  weeks: string[][];
  /** 'yyyy-MM' — days outside it are drawn as padding; absent, every day is its own. */
  month?: string;
  today: string;
  byDay: Map<string, SocialCalendarItem[]>;
  onAdd: (day: string) => void;
  onOpen: (item: SocialCalendarItem) => void;
}

/**
 * Seven columns of days. A table, not an ARIA grid: the days hold buttons,
 * and a grid would promise arrow-key moves it does not have.
 */
export default function CalendarTable({ title, weeks, month, today, byDay, onAdd, onOpen }: Readonly<Props>) {
  return (
    <Box role="table" aria-label={title} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: 'action.hover' }}>
        {weekdayNames(weeks.slice(0, 1).flat()).map((name) => (
          <Typography key={name} component="div" role="columnheader" variant="caption" sx={{ p: 0.75, fontWeight: 600, textAlign: 'center' }}>
            {name}
          </Typography>
        ))}
      </Box>
      {weeks.map((week) => (
        <Box key={week[0]} role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {week.map((day) => (
            <CalendarDayCell
              key={day}
              day={day}
              today={today}
              inMonth={month ? day.startsWith(month) : true}
              items={byDay.get(day) ?? []}
              onAdd={onAdd}
              onOpen={onOpen}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
