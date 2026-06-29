import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addDays, isAfter, isBefore, set as setTimeOnDate, startOfDay } from 'date-fns';
import type { NewSlotInput } from './types';

// Mirror the server cap: availability can be published at most this far ahead.
const MAX_FUTURE_DAYS = 60;

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (slots: NewSlotInput[]) => Promise<void>;
}

function combineDateAndTime(date: Date, time: Date): Date {
  return setTimeOnDate(date, {
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

// One slot per day across [start, end] with the same daily window; past windows
// are skipped so a range that starts today still works.
function buildRecurringSlots(
  startDate: Date,
  endDate: Date,
  startTime: Date,
  endTime: Date,
  price: number,
): NewSlotInput[] {
  const slots: NewSlotInput[] = [];
  const now = new Date();
  // Match the server cap exactly so an end-of-range day past +60d is skipped
  // rather than failing the whole batch.
  const maxStart = addDays(now, MAX_FUTURE_DAYS);
  const last = startOfDay(endDate);
  let cursor = startOfDay(startDate);
  while (!isAfter(cursor, last)) {
    const start = combineDateAndTime(cursor, startTime);
    const end = combineDateAndTime(cursor, endTime);
    if (isAfter(start, now) && !isAfter(start, maxStart)) {
      slots.push({ start_at: start.toISOString(), end_at: end.toISOString(), price, notes: '' });
    }
    cursor = addDays(cursor, 1);
  }
  return slots;
}

/** Bulk-add a daily availability window across a date range at one price. The
 *  host wires onAdd (which calls the bulk-create API). Prop-driven + reusable. */
export default function RecurringAvailabilityDialog({ open, onClose, onAdd }: Readonly<Props>) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const maxDate = addDays(new Date(), MAX_FUTURE_DAYS);

  const reset = () => {
    setStartDate(null);
    setEndDate(null);
    setStartTime(null);
    setEndTime(null);
    setPrice('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = (): string | null => {
    if (!startDate || !endDate || !startTime || !endTime) return 'Pick the dates and the daily times.';
    if (isBefore(endDate, startDate)) return 'End date must be on or after the start date.';
    if (!isAfter(combineDateAndTime(startDate, endTime), combineDateAndTime(startDate, startTime))) {
      return 'Daily end time must be after the start time.';
    }
    return null;
  };

  const handleAdd = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    const slots = buildRecurringSlots(
      startDate as Date,
      endDate as Date,
      startTime as Date,
      endTime as Date,
      Math.max(0, Math.round(Number(price) || 0)),
    );
    if (slots.length === 0) {
      setError('That range has no upcoming slots.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(slots);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add slots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900, pr: 6 }}>
        Recurring availability
        <IconButton onClick={handleClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Add the same daily time window across a date range (up to {MAX_FUTURE_DAYS} days ahead).
          </Typography>
          <DatePicker
            label="Start date"
            value={startDate}
            onChange={setStartDate}
            minDate={new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <DatePicker
            label="End date"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate ?? new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <Stack direction="row" spacing={1}>
            <TimePicker label="Daily start" value={startTime} onChange={setStartTime} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            <TimePicker label="Daily end" value={endTime} onChange={setEndTime} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
          </Stack>
          <TextField
            size="small"
            type="number"
            label="Price (₹)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputProps={{ min: 0, step: 50 }}
            helperText="Applied to every slot. 0 = free."
          />
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add to calendar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
