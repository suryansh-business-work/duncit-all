import { useMemo } from 'react';
import { MenuItem, TextField, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { SlotCalendar } from '@duncit/slots/mui';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { ResubmitSlotOption, ResubmitVenueOption } from '../types';

interface VenueFieldProps {
  venues: ResubmitVenueOption[];
  value: string;
  error?: string;
  onChange: (venueId: string) => void;
}

/** Approved-venue picker for the resubmission — any partner venue is bookable. */
export function VenueField({ venues, value, error, onChange }: Readonly<VenueFieldProps>) {
  return (
    <TextField
      select
      label="Venue"
      required
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error ?? 'Pick the venue to request'}
    >
      {venues.map((venue) => (
        <MenuItem key={venue.id} value={venue.id}>
          {venue.venue_name}
          {venue.city ? ` · ${venue.city}` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface SlotFieldProps {
  slots: ResubmitSlotOption[];
  loading: boolean;
  disabled: boolean;
  value: string;
  error?: string;
  onChange: (slotId: string) => void;
}

/**
 * Available-slot picker for the chosen venue — the same calendar the create-pod
 * flow, the app and the portals use, so resubmitting feels like creating.
 */
export function SlotField({
  slots,
  loading,
  disabled,
  value,
  error,
  onChange,
}: Readonly<SlotFieldProps>) {
  const fmt = useDateFormat();
  const { slotLabels } = useHostPodActionsConfig();

  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        price: slot.price,
        // A venue can publish two spaces at the same hour; without the space the
        // two tiles would be indistinguishable.
        caption: slot.space_label || undefined,
      })),
    [slots],
  );

  if (disabled) {
    return (
      <Typography variant="body2" color="text.secondary">
        {slotLabels.pickVenueFirst}
      </Typography>
    );
  }

  return (
    <SlotCalendar
      slots={calendarSlots}
      loading={loading}
      error={error}
      selectedSlotId={value}
      onPick={(slot) => onChange(slot.id)}
      fmt={fmt}
      labels={slotLabels}
      required
    />
  );
}
