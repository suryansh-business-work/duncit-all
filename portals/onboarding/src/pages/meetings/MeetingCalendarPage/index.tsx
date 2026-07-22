import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Card, CircularProgress, ListItemIcon, Menu, MenuItem, Stack } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import MeetingDetailsDrawer from '../MeetingDetailsDrawer';
import {
  DISMISS_MEETING,
  MEETING_AVAILABILITY,
  MEETING_HOLIDAYS,
  ONBOARDING_MEETINGS,
  type MeetingAvailability,
  type MeetingHoliday,
  type OnboardingMeeting,
} from '../queries';
import CalendarHeader from './CalendarHeader';
import MonthView from './MonthView';
import TimeGridView from './TimeGridView';
import { rangeLabel, stepCursor, viewDays, type CalendarView } from './calendarMath';
import { logs } from '@duncit/logs';

interface MenuState {
  mouseX: number;
  mouseY: number;
  meeting: OnboardingMeeting;
}

/** Onboarding → Meeting → Calendar: Outlook-style Day / Week / Month views. */
export default function MeetingCalendarPage() {
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<OnboardingMeeting | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { data, loading, refetch } = useQuery<{ onboardingMeetings: OnboardingMeeting[] }>(ONBOARDING_MEETINGS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });
  const { data: avData } = useQuery<{ meetingAvailability: MeetingAvailability }>(MEETING_AVAILABILITY, { fetchPolicy: 'cache-and-network' });
  const { data: holData } = useQuery<{ meetingHolidays: MeetingHoliday[] }>(MEETING_HOLIDAYS, { fetchPolicy: 'cache-and-network' });
  const [dismissMeeting] = useMutation(DISMISS_MEETING);

  // Keep the "current time" line live without re-fetching meetings.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const availability = avData?.meetingAvailability;
  const slotMinutes = availability?.slot_minutes ?? 30;
  const meetings = useMemo(() => (data?.onboardingMeetings ?? []).filter((m) => !m.dismissed), [data]);
  const days = useMemo(() => viewDays(view, cursor), [view, cursor]);
  const holidays = useMemo(
    () => new Map((holData?.meetingHolidays ?? []).map((h) => [h.date, h])),
    [holData],
  );

  const openContext = (e: React.MouseEvent, m: OnboardingMeeting) => {
    e.preventDefault();
    setMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 4, meeting: m });
  };

  const removeFromCalendar = async () => {
    if (!menu) return;
    const { id } = menu.meeting;
    setMenu(null);
    try {
      await dismissMeeting({ variables: { id } });
      await refetch();
    } catch (e) {
      logs.portal['onboarding'].error('meeting-calendar', 'removeFromCalendar', {
        error: e,
        id,
        msg: 'could not remove meeting',
      });
    }
  };

  const isCancelled = menu?.meeting.status === 'CANCELLED';

  let body: React.ReactNode;
  if (loading && meetings.length === 0) {
    body = <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>;
  } else if (view === 'month') {
    body = <MonthView days={days} cursor={cursor} meetings={meetings} holidays={holidays} slotMinutes={slotMinutes} now={now} onSelect={setSelected} onContext={openContext} onMore={(day) => { setCursor(day); setView('day'); }} />;
  } else {
    body = <TimeGridView days={days} meetings={meetings} holidays={holidays} availability={availability} slotMinutes={slotMinutes} now={now} onSelect={setSelected} onContext={openContext} />;
  }

  return (
    <Stack spacing={2.5}>
      <CalendarHeader
        view={view}
        label={rangeLabel(view, cursor)}
        onView={setView}
        onStep={(dir) => setCursor((c) => stepCursor(view, c, dir))}
        onToday={() => setCursor(new Date())}
      />

      <Card sx={{ p: 1 }}>
        {body}
      </Card>

      <Menu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
      >
        <MenuItem onClick={removeFromCalendar} disabled={!isCancelled}>
          <ListItemIcon><EventBusyIcon fontSize="small" /></ListItemIcon>
          {isCancelled ? 'Remove from my calendar' : 'Only cancelled meetings can be removed'}
        </MenuItem>
      </Menu>

      <MeetingDetailsDrawer meeting={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
