import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { UPDATE_VENUE_HOLIDAYS } from '../queries';

interface Props {
  venueId: string | null;
  holidays: string[];
  disabled?: boolean;
  onSaved: () => Promise<unknown>;
}

/** Owner-managed leave/holiday dates. Slots can never be created or booked on
 * these dates and they render red in the availability calendar. Saved through
 * `updateVenueSettings`, so it works for approved venues too. */
export default function LeavesSection({ venueId, holidays, disabled = false, onSaved }: Readonly<Props>) {
  const [dates, setDates] = useState<string[]>(holidays);
  const [picked, setPicked] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [save, saveState] = useMutation(UPDATE_VENUE_HOLIDAYS);

  useEffect(() => setDates(holidays), [holidays]);
  const dirty = JSON.stringify(dates) !== JSON.stringify(holidays);

  const addPicked = () => {
    if (!picked || Number.isNaN(picked.getTime())) return;
    const ymd = format(picked, 'yyyy-MM-dd');
    setDates((prev) => (prev.includes(ymd) ? prev : [...prev, ymd].sort((a, b) => a.localeCompare(b))));
    setPicked(null);
  };

  const removeDate = (date: string) => setDates((prev) => prev.filter((item) => item !== date));

  const persist = async () => {
    if (!venueId) return;
    setFeedback(null);
    try {
      await save({ variables: { venue_doc_id: venueId, input: { holidays: dates } } });
      await onSaved();
      setFeedback({ severity: 'success', text: 'Leaves & holidays saved. These dates are now blocked for slots and bookings.' });
    } catch (err) {
      setFeedback({ severity: 'error', text: (err as Error).message });
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" fontWeight={800}>Leaves & Holidays</Typography>
        <Typography variant="caption" color="text.secondary">
          Mark the dates your venue stays closed. No slots can be created on these dates, hosts cannot book
          them, and they show in red on your availability calendar.
        </Typography>
      </Stack>

      {!venueId && (
        <Alert severity="info">Save the Venue Details section first — leaves are stored on your venue.</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <DatePicker
          label="Add a leave date"
          value={picked}
          onChange={setPicked}
          disablePast
          disabled={disabled || !venueId}
          slotProps={{ textField: { size: 'small', helperText: 'Pick a date, then press Add' } }}
        />
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          disabled={disabled || !venueId || !picked}
          onClick={addPicked}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, mb: { sm: 2.5 } }}
        >
          Add date
        </Button>
      </Stack>

      {dates.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No leave dates yet.</Typography>
      ) : (
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
          {dates.map((date) => (
            <Chip
              key={date}
              icon={<EventBusyIcon />}
              label={format(new Date(`${date}T00:00:00`), 'EEE, d MMM yyyy')}
              color="error"
              variant="outlined"
              disabled={disabled}
              onDelete={disabled ? undefined : () => removeDate(date)}
            />
          ))}
        </Stack>
      )}

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.text}</Alert>
      )}

      {!disabled && (
        <Button
          startIcon={<SaveIcon />}
          variant="contained"
          disabled={!venueId || !dirty || saveState.loading}
          onClick={() => void persist()}
          sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
        >
          {saveState.loading ? 'Saving…' : 'Save leaves & holidays'}
        </Button>
      )}
    </Stack>
  );
}
