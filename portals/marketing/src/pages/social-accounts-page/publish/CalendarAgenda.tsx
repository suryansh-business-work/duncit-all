import { Alert, Stack, Typography } from '@mui/material';
import type { SocialCalendarItem } from '../publish.queries';
import CalendarItemButton from './CalendarItemButton';
import { dayTitle } from './calendar-grid';

interface Props {
  days: string[];
  byDay: Map<string, SocialCalendarItem[]>;
  onOpen: (item: SocialCalendarItem) => void;
  /** What to say when no day in the range has a post — worded for the range on screen. */
  emptyText: string;
}

/** A range as a list: on a phone seven columns do not fit, and a day is a list anyway, so it reads as the days that have posts. */
export default function CalendarAgenda({ days, byDay, onOpen, emptyText }: Readonly<Props>) {
  const busy = days.flatMap((day) => {
    const items = byDay.get(day) ?? [];
    return items.length > 0 ? [{ day, items }] : [];
  });
  if (busy.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        {emptyText}
      </Alert>
    );
  }
  return (
    <Stack spacing={2} data-testid="social-calendar-agenda">
      {busy.map(({ day, items }) => (
        <Stack key={day} spacing={0.75}>
          <Typography variant="subtitle2" component="h3">
            {dayTitle(day)}
          </Typography>
          {items.map((item) => (
            <CalendarItemButton key={`${item.kind}-${item.id}`} item={item} onOpen={onOpen} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
