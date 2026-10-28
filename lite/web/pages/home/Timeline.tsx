import { Box, Stack, Typography } from '@mui/material';
import { groupEventsByDay } from '../../components/events/groupByDay';
import { useEventTime } from '../../components/events/useEventTime';
import { TimelineCard } from './TimelineCard';
import type { MyEvent } from './useMyEvents';

/** The day a group starts on, as the console formats a date, with Today / Yesterday underneath when it is one. */
function DayHeading({ first }: Readonly<{ first: MyEvent['event'] }>) {
  const when = useEventTime(first);
  return (
    <Stack sx={{ position: { md: 'sticky' }, top: { md: 76 } }}>
      <Typography variant="body1" component="h2" sx={{ fontWeight: 700 }}>
        {when.date}
      </Typography>
      {when.day === when.date ? null : (
        <Typography variant="body2" color="text.secondary">
          {when.day}
        </Typography>
      )}
    </Stack>
  );
}

/**
 * The reader's events as a timeline: the day on the left, a dashed rail, and
 * that day's cards on the right (stacked under the day on a phone).
 */
export function Timeline({ rows }: Readonly<{ rows: readonly MyEvent[] }>) {
  const groups = groupEventsByDay(rows.map((row) => ({ ...row.event, row })));
  return (
    <Stack component="ol" spacing={3} sx={{ listStyle: 'none', p: 0, m: 0 }} data-testid="timeline">
      {groups.map((group) => (
        <Box component="li" key={group.key} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '150px 1fr' }, gap: { xs: 1.5, md: 3 } }}>
          <DayHeading first={group.events[0]} />
          <Stack spacing={1.5} sx={{ position: 'relative', pl: { md: 3 }, borderLeft: { md: 1 }, borderLeftStyle: { md: 'dashed' }, borderColor: { md: 'divider' } }}>
            {group.events.map((entry) => (
              <TimelineCard key={entry.row.event.id} item={entry.row} />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
