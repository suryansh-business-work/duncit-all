import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventIcon from '@mui/icons-material/Event';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { ONBOARDING_MEETINGS, type OnboardingMeeting } from './queries';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const eventDate = (m: OnboardingMeeting) => new Date(m.scheduled_at ?? m.requested_at);

/** Onboarding → Meeting → Calendar: month grid of venue + host meetings. */
export default function MeetingCalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const { data, loading } = useQuery<{ onboardingMeetings: OnboardingMeeting[] }>(ONBOARDING_MEETINGS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });
  const meetings = data?.onboardingMeetings ?? [];

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) }),
    [cursor],
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <EventIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>Meeting Calendar</Typography>
          <Typography variant="body2" color="text.secondary">Scheduled (and requested) onboarding meetings — venue in blue, host in purple.</Typography>
        </Box>
        <Stack direction="row" alignItems="center">
          <IconButton size="small" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeftIcon /></IconButton>
          <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 150, textAlign: 'center' }}>{format(cursor, 'MMMM yyyy')}</Typography>
          <IconButton size="small" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRightIcon /></IconButton>
        </Stack>
      </Stack>

      <Card sx={{ p: 1 }}>
        {loading && meetings.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {WEEKDAYS.map((d) => <Typography key={d} variant="caption" color="text.secondary" sx={{ p: 0.5, fontWeight: 700, textAlign: 'center' }}>{d}</Typography>)}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: 1, borderLeft: 1, borderColor: 'divider' }}>
              {days.map((day) => {
                const dayMeetings = meetings.filter((m) => isSameDay(eventDate(m), day));
                const muted = !isSameMonth(day, cursor);
                return (
                  <Box key={day.toISOString()} sx={{ minHeight: 92, borderRight: 1, borderBottom: 1, borderColor: 'divider', p: 0.5, bgcolor: muted ? 'action.hover' : 'background.paper' }}>
                    <Typography variant="caption" sx={{ fontWeight: isToday(day) ? 800 : 500, color: muted ? 'text.disabled' : isToday(day) ? 'primary.main' : 'text.primary' }}>{format(day, 'd')}</Typography>
                    <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                      {dayMeetings.slice(0, 3).map((m) => (
                        <Tooltip key={m.id} title={`${m.kind} · ${m.user_name || m.contact_name || 'Applicant'} · ${m.status}`}>
                          <Box sx={{ bgcolor: m.kind === 'VENUE' ? 'info.main' : 'secondary.main', color: '#fff', borderRadius: 0.5, px: 0.5, fontSize: 10, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {format(eventDate(m), 'p')} {m.user_name || m.contact_name || m.kind}
                          </Box>
                        </Tooltip>
                      ))}
                      {dayMeetings.length > 3 && <Typography variant="caption" color="text.secondary">+{dayMeetings.length - 3} more</Typography>}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Card>
    </Stack>
  );
}
