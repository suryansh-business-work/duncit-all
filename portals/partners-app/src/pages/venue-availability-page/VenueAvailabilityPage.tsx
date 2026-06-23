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
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { AvailabilityCalendar, DayDrawer, type NewSlotInput } from '@duncit/availability-calendar';
import {
  CREATE_VENUE_SLOTS,
  DELETE_VENUE_SLOT,
  UPDATE_VENUE_SLOT,
  VENUE_SLOTS,
  type VenueSlotRow,
} from './queries';
import { MY_VENUES } from '../register-venue-page/queries';

export default function VenueAvailabilityPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: venuesData } = useQuery(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venue = (venuesData?.myVenues ?? []).find((v: any) => v.id === venueId);
  const isApproved = venue?.status === 'APPROVED';

  const { data, loading, error, refetch } = useQuery<{ venueSlots: VenueSlotRow[] }>(VENUE_SLOTS, {
    variables: {
      venue_id: venueId,
      from: startOfMonth(month).toISOString(),
      to: endOfMonth(month).toISOString(),
    },
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

  const slotsForSelected = useMemo<VenueSlotRow[]>(() => {
    if (!selectedDate) return [];
    return (data?.venueSlots ?? [])
      .filter((s) => isSameDay(new Date(s.start_at), selectedDate))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [data, selectedDate]);

  if (!venue && venuesData) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 860, mx: 'auto' }}>
        <Alert severity="error">Venue not found, or it isn't yours.</Alert>
        <Button component={RouterLink} to="/register-venue" variant="outlined">
          Back to venues
        </Button>
      </Stack>
    );
  }

  if (!isApproved && venue) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 860, mx: 'auto' }}>
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
    <Stack spacing={2.5} sx={{ maxWidth: 860, mx: 'auto' }}>
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
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <IconButton onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={900}>
              {format(month, 'MMMM yyyy')}
            </Typography>
            <IconButton onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <AvailabilityCalendar
              month={month}
              slots={data?.venueSlots ?? []}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <Legend color="success.light" label="A — Available" />
            <Legend color="warning.light" label="B — Booked" />
            <Legend color="grey.300" label="× — Blocked" />
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
