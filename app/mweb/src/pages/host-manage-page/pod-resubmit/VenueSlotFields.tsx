import { CircularProgress, MenuItem, TextField } from '@mui/material';
import { slotOptionLabel } from './pod-resubmit.form';
import type { ResubmitSlotOption, ResubmitVenueOption } from './pod-resubmit.types';

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

/** Available-slot picker for the chosen venue (time window + space + price). */
export function SlotField({ slots, loading, disabled, value, error, onChange }: Readonly<SlotFieldProps>) {
  let helper = error ?? 'Pick an open time slot';
  if (!error && disabled) helper = 'Select a venue first';
  if (!error && !disabled && !loading && slots.length === 0) helper = 'No open slots at this venue — pick another venue';
  return (
    <TextField
      select
      label="Time slot"
      required
      fullWidth
      disabled={disabled || loading}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={helper}
      InputProps={loading ? { endAdornment: <CircularProgress size={16} /> } : undefined}
    >
      {slots.map((slot) => (
        <MenuItem key={slot.id} value={slot.id}>
          {slotOptionLabel(slot)}
        </MenuItem>
      ))}
    </TextField>
  );
}
