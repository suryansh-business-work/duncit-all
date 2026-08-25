import { useEffect, useMemo } from 'react';
import { Alert, Typography } from '@mui/material';
import { SlotCalendar } from '@duncit/slots/mui';
import { withCurrentSlot, type CalendarSlot } from '@duncit/slots';

import { usePodFormData } from '../context';
import { useVenueSlots, type VenueSlot } from './useVenueSlots';

export interface VenueSlotFieldProps {
  venueId: string;
  selectedSlotId: string;
  /**
   * The pod's already-booked slot when editing. A booked slot is no longer
   * "available", so it is merged back in and never auto-cleared.
   */
  currentSlot?: { id: string; start_at: string; end_at: string; whole_day?: boolean } | null;
  onSelect: (slot: { id: string; start_at: string; end_at: string } | null) => void;
}

/**
 * Pick the venue slot that sets the pod's date & time — a calendar, then the
 * times available on the chosen day. Replaces the old flat dropdown, and renders
 * the same two steps mWeb and the app show.
 */
export default function VenueSlotField({
  venueId,
  selectedSlotId,
  currentSlot,
  onSelect,
}: Readonly<VenueSlotFieldProps>) {
  const { dateFormatter, slotLabels } = usePodFormData();
  const { slots: available, loading, error } = useVenueSlots(venueId);

  const slots = useMemo<CalendarSlot[]>(() => {
    const booked: VenueSlot | null = currentSlot
      ? {
          ...currentSlot,
          whole_day: currentSlot.whole_day ?? false,
          notes: slotLabels.currentlyBooked,
          price: 0,
          space_label: '',
          capacity: 0,
        }
      : null;
    return withCurrentSlot(available, booked).map((slot) => ({
      id: slot.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      whole_day: slot.whole_day,
      price: slot.price,
      // The space is what tells two 10:00 tiles apart; the booked-slot note
      // takes the line instead, since that slot has no space of its own.
      caption: slot.notes || slot.space_label || slotLabels.wholeVenue,
    }));
  }, [available, currentSlot, slotLabels]);

  // A saved slot that has vanished from the venue's availability must not stay
  // silently selected — the server would reject it at submit.
  useEffect(() => {
    if (!selectedSlotId || loading) return;
    if (!slots.some((slot) => slot.id === selectedSlotId)) onSelect(null);
  }, [slots, selectedSlotId, loading, onSelect]);

  if (!venueId) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {slotLabels.pickVenueFirst}
      </Typography>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!loading && slots.length === 0) {
    return <Alert severity="warning">{slotLabels.empty}</Alert>;
  }

  return (
    <SlotCalendar
      slots={slots}
      loading={loading}
      selectedSlotId={selectedSlotId}
      onPick={(slot) =>
        onSelect({ id: slot.id, start_at: slot.start_at, end_at: slot.end_at ?? slot.start_at })
      }
      fmt={dateFormatter}
      labels={slotLabels}
      required
    />
  );
}
