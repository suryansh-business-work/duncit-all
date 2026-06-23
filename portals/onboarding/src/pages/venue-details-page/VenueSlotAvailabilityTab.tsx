import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { addMonths, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import {
  AvailabilityCalendar,
  DayDrawer,
  type NewSlotInput,
  type VenueSlotRow,
} from '@duncit/availability-calendar';
import {
  ADMIN_CREATE_VENUE_SLOTS,
  ADMIN_DELETE_VENUE_SLOT,
  ADMIN_UPDATE_VENUE_SLOT,
  ADMIN_VENUE_SLOTS,
} from './queries';

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

// Onboarding-side slot management for any venue. Reuses the shared calendar +
// day editor; wires them to the admin (role-gated) slot mutations.
export default function VenueSlotAvailabilityTab({ venueId }: Readonly<{ venueId: string }>) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, loading, error, refetch } = useQuery<{ adminVenueSlots: VenueSlotRow[] }>(ADMIN_VENUE_SLOTS, {
    variables: {
      venue_id: venueId,
      from: startOfMonth(month).toISOString(),
      to: endOfMonth(month).toISOString(),
    },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  const [createSlots] = useMutation(ADMIN_CREATE_VENUE_SLOTS);
  const [updateSlot] = useMutation(ADMIN_UPDATE_VENUE_SLOT);
  const [deleteSlot] = useMutation(ADMIN_DELETE_VENUE_SLOT);

  const slotsForSelected = useMemo<VenueSlotRow[]>(() => {
    if (!selectedDate) return [];
    return (data?.adminVenueSlots ?? [])
      .filter((slot) => isSameDay(new Date(slot.start_at), selectedDate))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [data, selectedDate]);

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

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Add or manage this venue&apos;s bookable time slots on behalf of the partner. Hosts only see
        Available slots when creating a pod.
      </Typography>
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
              slots={data?.adminVenueSlots ?? []}
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
