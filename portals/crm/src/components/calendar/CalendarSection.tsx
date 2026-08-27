import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
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
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import {
  addDays, addMonths, addWeeks, addYears, eachDayOfInterval, endOfWeek, endOfYear, format, startOfDay, startOfWeek, startOfYear,
} from 'date-fns';
import {
  useCalendarEvents,
  type CalEvent,
  type EntityFilter,
  type StatusFilter,
} from './useCalendarEvents';
import {
  CRM_REMINDERS,
  DELETE_CRM_REMINDER,
  TOGGLE_CRM_REMINDER,
  type CrmReminder,
} from '../../api/reminders.gql';
import CalendarMonth from './CalendarMonth';
import CalendarList from './CalendarList';
import EventDrawer from './EventDrawer';
import ReminderFormDialog from '../reminders-tab/ReminderFormDialog';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

type View = 'month' | 'week' | 'day' | 'upcoming' | 'year';
type Translate = ReturnType<typeof useTranslation>['t'];

const views = (t: Translate): { value: View; label: string }[] =>[
  { value: 'day', label: t('crm.components.day') }, { value: 'week', label: t('crm.components.week') }, { value: 'month', label: t('crm.components.month') },
  { value: 'year', label: t('crm.components.year') }, { value: 'upcoming', label: t('crm.components.upcoming') },
];

/** Full-width dashboard reminders calendar (reminders + lead follow-ups). */
export default function CalendarSection() {
  const { t } = useTranslation();
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
    if (view === 'day') return { title: formatDate(cursor), listDays: [cursor] };
    if (view === 'year') return { title: format(cursor, 'yyyy'), listDays: eachDayOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) }) };
    if (view === 'upcoming') return { title: t('crm.components.upcoming'), listDays: eachDayOfInterval({ start: startOfDay(new Date()), end: addDays(new Date(), 60) }) };
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
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            mb: 1.5
          }}>
          <EventIcon color="primary" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              mr: 1
            }}>{t('crm.components.remindersCalendar')}</Typography>
          {view !== 'upcoming' && (
            <Stack direction="row" sx={{
              alignItems: "center"
            }}>
              <DuncitIconButton size="small" onClick={() => step(-1)}><ChevronLeftIcon /></DuncitIconButton>
              <DuncitButton size="small" onClick={() => setCursor(new Date())}>{t('crm.components.today')}</DuncitButton>
              <DuncitIconButton size="small" onClick={() => step(1)}><ChevronRightIcon /></DuncitIconButton>
            </Stack>
          )}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              minWidth: 160
            }}>{title}</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField select size="small" label={t('shell.common.type')} value={entity} onChange={(e) => setEntity(e.target.value as EntityFilter)} sx={{ minWidth: 120 }}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="VENUE_LEAD">{t('crm.common.venue')}</MenuItem>
            <MenuItem value="HOST_LEAD">Host</MenuItem>
          </TextField>
          <TextField select size="small" label={t('shell.common.status')} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} sx={{ minWidth: 120 }}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PENDING">{t('crm.components.pending')}</MenuItem>
            <MenuItem value="DONE">Done</MenuItem>
          </TextField>
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add</DuncitButton>
        </Stack>

        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => v && setView(v)} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          {views(t).map((v) => <ToggleButton key={v.value} value={v.value}>{v.label}</ToggleButton>)}
        </ToggleButtonGroup>

        {loading && events.length === 0 && (
          <Stack
            sx={{
              alignItems: "center",
              py: 4
            }}><CircularProgress /></Stack>
        )}
        {(!loading || events.length > 0) && view === 'month' && (
          <CalendarMonth cursor={cursor} events={events} onEvent={onEvent} />
        )}
        {(!loading || events.length > 0) && view !== 'month' && (
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
