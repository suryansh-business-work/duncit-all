import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import TodayIcon from '@mui/icons-material/Today';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  AvailabilityCalendar,
  DayDrawer,
  type CalendarView,
  type NewSlotInput,
} from '@duncit/availability-calendar';
import {
  CREATE_VENUE_SLOTS,
  DELETE_VENUE_SLOT,
  UPDATE_VENUE_SLOT,
  VENUE_SLOTS,
  type VenueSlotRow,
} from './queries';
import RecurringAvailabilityDialog from './recurring/RecurringAvailabilityDialog';
import { MY_VENUES } from '../register-venue-page/queries';

function viewRange(view: CalendarView, anchor: Date) {
  if (view === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === 'week') {
    return { from: startOfWeek(anchor, { weekStartsOn: 0 }), to: endOfWeek(anchor, { weekStartsOn: 0 }) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

function periodLabel(view: CalendarView, anchor: Date, range: { from: Date; to: Date }) {
  if (view === 'day') return format(anchor, 'EEEE, dd MMM yyyy');
  if (view === 'week') return `${format(range.from, 'dd MMM')} – ${format(range.to, 'dd MMM')}`;
  return format(anchor, 'MMMM yyyy');
}

export default function VenueAvailabilityPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  // Anchor on today so Day/Week views open on the current period (month view
  // derives its own startOfMonth). Keeping the 1st here would land Day on a past date.
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const { data: venuesData } = useQuery(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venue = (venuesData?.myVenues ?? []).find((v: any) => v.id === venueId);
  const isApproved = venue?.status === 'APPROVED';
  const venueHolidays: string[] = venue?.settings?.holidays ?? [];

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const { data, loading, error, refetch } = useQuery<{ venueSlots: VenueSlotRow[] }>(VENUE_SLOTS, {
    variables: { venue_id: venueId, from: range.from.toISOString(), to: range.to.toISOString() },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  const [createSlots] = useMutation(CREATE_VENUE_SLOTS);
  const [updateSlot] = useMutation(UPDATE_VENUE_SLOT);
  const [deleteSlot] = useMutation(DELETE_VENUE_SLOT);

  const handleCreate = async (input: NewSlotInput) => {
    await createSlots({ variables: { input: { venue_id: venueId, slots: [input] } } });
    await refetch();
  };
  const handleToggleBlock = async (slot: VenueSlotRow) => {
    await updateSlot({ variables: { slot_id: slot.id, input: { block: slot.status !== 'BLOCKED' } } });
    await refetch();
  };
  const handleDelete = async (slotId: string) => {
    await deleteSlot({ variables: { slot_id: slotId } });
    await refetch();
  };

  const shift = (dir: 1 | -1) => {
    if (view === 'month') setAnchor(addMonths(anchor, dir));
    else if (view === 'week') setAnchor(addDays(anchor, dir * 7));
    else setAnchor(addDays(anchor, dir));
  };

  const slotsForSelected = useMemo<VenueSlotRow[]>(() => {
    if (!selectedDate) return [];
    return (data?.venueSlots ?? [])
      .filter((s) => isSameDay(new Date(s.start_at), selectedDate))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [data, selectedDate]);

  if (!venue && venuesData) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Alert severity="error">Venue not found, or it isn't yours.</Alert>
        <Button component={RouterLink} to="/register-venue" variant="outlined">
          Back to venues
        </Button>
      </Stack>
    );
  }

  if (!isApproved && venue) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Alert severity="warning">
          Availability is only editable once your venue is approved (current status: {venue.status}).
        </Alert>
        <Button component={RouterLink} to="/register-venue" variant="outlined">
          Back to venues
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/register-venue')} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Venue · {venue?.venue_name ?? '…'}
          </Typography>
          <Typography variant="h4" fontWeight={950} sx={{ lineHeight: 1.1 }}>
            Slot availability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pick a date to add or manage time slots. Hosts will only see your Available slots when creating a pod.
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_e, next) => next && setView(next)}
              aria-label="Calendar view"
            >
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
              <IconButton onClick={() => shift(-1)} aria-label="Previous">
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight={900} sx={{ minWidth: 160, textAlign: 'center' }}>
                {periodLabel(view, anchor, range)}
              </Typography>
              <IconButton onClick={() => shift(1)} aria-label="Next">
                <ChevronRightIcon />
              </IconButton>
              <Button size="small" startIcon={<TodayIcon />} onClick={() => setAnchor(new Date())}>
                Today
              </Button>
            </Stack>

            <Button
              variant="outlined"
              startIcon={<EventRepeatIcon />}
              onClick={() => setRecurringOpen(true)}
            >
              Recurring availability
            </Button>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <AvailabilityCalendar
              month={anchor}
              view={view}
              slots={data?.venueSlots ?? []}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              holidays={venueHolidays}
            />
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <Legend color="success.light" label="A — Available" />
            <Legend color="info.light" label="P — Pending approval" />
            <Legend color="warning.light" label="B — Booked" />
            <Legend color="grey.300" label="× — Blocked" />
            <Legend color="error.light" label="Leave / Holiday" />
          </Stack>
        </CardContent>
      </Card>

      <DayDrawer
        open={!!selectedDate}
        date={selectedDate}
        slots={slotsForSelected}
        onClose={() => setSelectedDate(null)}
        onCreate={handleCreate}
        onToggleBlock={handleToggleBlock}
        onDelete={handleDelete}
        isHoliday={Boolean(selectedDate && venueHolidays.includes(format(selectedDate, 'yyyy-MM-dd')))}
      />

      <RecurringAvailabilityDialog
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        venueId={venueId}
        settings={venue?.settings}
        capacityItems={venue?.capacity_items ?? []}
        venueCapacity={venue?.capacity ?? 0}
        onDone={async () => {
          await refetch();
        }}
      />
    </Stack>
  );
}

function Legend({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
