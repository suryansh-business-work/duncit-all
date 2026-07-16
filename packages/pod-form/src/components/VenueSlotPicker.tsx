import { useEffect, useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { format } from 'date-fns';

const VENUE_AVAILABLE_SLOTS = gql`
  query VenueAvailableSlotsForPicker($venue_id: ID!, $from: String) {
    venueAvailableSlots(venue_id: $venue_id, from: $from) {
      id
      start_at
      end_at
      notes
    }
  }
`;

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
  notes: string;
}

interface Props {
  venueId: string;
  selectedSlotId: string;
  /**
   * The pod's already-booked slot when editing. Booked slots are no longer
   * "available", so it is offered as an extra option and never auto-cleared.
   */
  currentSlot?: { id: string; start_at: string; end_at: string } | null;
  onSelect: (slot: { id: string; start_at: string; end_at: string } | null) => void;
}

/** Lists a venue's bookable availability slots; picking one sets the pod dates. */
export default function VenueSlotPicker({ venueId, selectedSlotId, currentSlot, onSelect }: Readonly<Props>) {
  const fromIso = useMemo(() => new Date().toISOString(), []);
  const { data, loading, error } = useQuery<{ venueAvailableSlots: Slot[] }>(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId, from: fromIso },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  const available = data?.venueAvailableSlots ?? [];
  const slots =
    currentSlot && !available.some((s) => s.id === currentSlot.id)
      ? [{ ...currentSlot, notes: 'Currently booked for this pod' }, ...available]
      : available;

  useEffect(() => {
    if (!selectedSlotId) return;
    if (loading) return;
    if (!slots.some((s) => s.id === selectedSlotId)) {
      onSelect(null);
    }
  }, [slots, selectedSlotId, loading, onSelect]);

  if (!venueId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Select a venue first to see its available slots.
      </Typography>
    );
  }

  if (loading && slots.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading available slots…
      </Typography>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!loading && slots.length === 0) {
    return (
      <Alert severity="warning">
        This venue has no available slots. Ask the venue owner to add availability before creating a pod here.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.25}>
      <TextField
        select
        label="Available slot"
        value={selectedSlotId}
        onChange={(event) => {
          const id = event.target.value;
          const slot = slots.find((s) => s.id === id);
          onSelect(slot ? { id: slot.id, start_at: slot.start_at, end_at: slot.end_at } : null);
        }}
        required
        fullWidth
        helperText="Picking a slot sets the pod's date & time automatically."
      >
        {slots.map((slot) => (
          <MenuItem key={slot.id} value={slot.id}>
            <Stack>
              <Typography variant="body2" fontWeight={800}>
                {format(new Date(slot.start_at), 'EEE, dd MMM yyyy')} ·{' '}
                {format(new Date(slot.start_at), 'hh:mm a')} – {format(new Date(slot.end_at), 'hh:mm a')}
              </Typography>
              {slot.notes && (
                <Typography variant="caption" color="text.secondary">
                  {slot.notes}
                </Typography>
              )}
            </Stack>
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
