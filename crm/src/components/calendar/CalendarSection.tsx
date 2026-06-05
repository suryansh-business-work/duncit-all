import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import {
  addDays, addMonths, addWeeks, addYears, eachDayOfInterval, endOfWeek, endOfYear, format, startOfDay, startOfWeek, startOfYear,
} from 'date-fns';
import { useCalendarEvents, type CalEvent, type EntityFilter, type StatusFilter } from './useCalendarEvents';
import { CRM_REMINDERS, DELETE_CRM_REMINDER, TOGGLE_CRM_REMINDER, type CrmReminder } from '../../api/reminders.gql';
import CalendarMonth from './CalendarMonth';
import CalendarList from './CalendarList';
import EventDrawer from './EventDrawer';
import ReminderFormDialog from '../reminders-tab/ReminderFormDialog';

type View = 'month' | 'week' | 'day' | 'upcoming' | 'year';
const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' }, { value: 'upcoming', label: 'Upcoming' },
];

/** Full-width dashboard reminders calendar (reminders + lead follow-ups). */
export default function CalendarSection() {
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [entity, setEntity] = useState<EntityFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [editing, setEditing] = useState<CrmReminder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const { events, loading, refetch } = useCalendarEvents(entity, status);
  const [toggleMut] = useMutation(TOGGLE_CRM_REMINDER);
  const [deleteMut] = useMutation(DELETE_CRM_REMINDER);

  const step = (dir: 1 | -1) => {
    if (view === 'day') setCursor((c) => addDays(c, dir));
    else if (view === 'week') setCursor((c) => addWeeks(c, dir));
    else if (view === 'year') setCursor((c) => addYears(c, dir));
    else setCursor((c) => addMonths(c, dir));
  };

  const { title, listDays } = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(cursor);
      return { title: `${format(s, 'dd MMM')} – ${format(endOfWeek(cursor), 'dd MMM yyyy')}`, listDays: eachDayOfInterval({ start: s, end: endOfWeek(cursor) }) };
    }
    if (view === 'day') return { title: format(cursor, 'EEE, dd MMM yyyy'), listDays: [cursor] };
    if (view === 'year') return { title: format(cursor, 'yyyy'), listDays: eachDayOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) }) };
    if (view === 'upcoming') return { title: 'Upcoming', listDays: eachDayOfInterval({ start: startOfDay(new Date()), end: addDays(new Date(), 60) }) };
    return { title: format(cursor, 'MMMM yyyy'), listDays: [] };
  }, [view, cursor]);

  // Clicking any event opens the details drawer (which offers jump / edit / done).
  const onEvent = (e: CalEvent) => setSelected(e);

  const editFromDrawer = (e: CalEvent) => {
    setSelected(null);
    if (e.reminder) { setEditing(e.reminder); setFormOpen(true); }
  };
  const toggleFromDrawer = async (e: CalEvent) => {
    if (e.reminder) await toggleMut({ variables: { id: e.reminder.id } });
    setSelected(null);
    refetch();
  };
  const deleteFromDrawer = async (e: CalEvent) => {
    if (e.reminder) await deleteMut({ variables: { id: e.reminder.id } });
    setSelected(null);
    refetch();
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <EventIcon color="primary" />
          <Typography variant="h6" fontWeight={800} sx={{ mr: 1 }}>Reminders calendar</Typography>
          {view !== 'upcoming' && (
            <Stack direction="row" alignItems="center">
              <IconButton size="small" onClick={() => step(-1)}><ChevronLeftIcon /></IconButton>
              <Button size="small" onClick={() => setCursor(new Date())}>Today</Button>
              <IconButton size="small" onClick={() => step(1)}><ChevronRightIcon /></IconButton>
            </Stack>
          )}
          <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 160 }}>{title}</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField select size="small" label="Type" value={entity} onChange={(e) => setEntity(e.target.value as EntityFilter)} sx={{ minWidth: 120 }}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="VENUE_LEAD">Venue</MenuItem>
            <MenuItem value="HOST_LEAD">Host</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} sx={{ minWidth: 120 }}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="DONE">Done</MenuItem>
          </TextField>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add</Button>
        </Stack>

        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => v && setView(v)} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          {VIEWS.map((v) => <ToggleButton key={v.value} value={v.value}>{v.label}</ToggleButton>)}
        </ToggleButtonGroup>

        {loading && events.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
        ) : view === 'month' ? (
          <CalendarMonth cursor={cursor} events={events} onEvent={onEvent} />
        ) : (
          <CalendarList days={listDays} events={events} onEvent={onEvent} emptyHint="Nothing scheduled in this range." />
        )}
      </CardContent>

      <EventDrawer
        event={selected}
        onClose={() => setSelected(null)}
        onEdit={editFromDrawer}
        onToggleDone={toggleFromDrawer}
        onDelete={deleteFromDrawer}
      />

      <ReminderFormDialog
        open={formOpen}
        entity={editing?.entity_type ?? 'GENERAL'}
        leadId={editing?.lead_id ?? null}
        reminder={editing}
        refetchQueries={[{ query: CRM_REMINDERS, variables: { filter: status === 'ALL' ? {} : { status } } }]}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />
    </Card>
  );
}
