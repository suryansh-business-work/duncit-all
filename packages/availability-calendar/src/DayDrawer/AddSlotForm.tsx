import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addDays, isAfter, isBefore, set as setTimeOnDate, startOfDay } from 'date-fns';
import { wholeDayWindow } from '../slot-window';
import type { NewSlotInput, VenueSpace } from '../types';

/** '' is a real value here (whole venue), so the "nothing picked yet" sentinel
 * has to be something a label can never be. */
const NO_SPACE = ' ';

// Mirror the server cap: availability can be published at most this far ahead.
const MAX_FUTURE_DAYS = 60;

function combineDateAndTime(date: Date, time: Date): Date {
  return setTimeOnDate(date, {
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

interface Props {
  /** The clicked calendar date — seeds the start/end dates. */
  date: Date;
  isHoliday: boolean;
  spaces: VenueSpace[];
  onCreate: (input: NewSlotInput) => Promise<void>;
}

/**
 * The simplified add form: a Whole-day toggle plus start date & time and end
 * date & time. Same-date = a single-day slot; a later end date = ONE continuous
 * multi-day (activity) booking. Whole-day hides the clocks and books the
 * entire date range.
 */
export default function AddSlotForm({ date, isHoliday, spaces, onCreate }: Readonly<Props>) {
  const [wholeDay, setWholeDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(date);
  const [endDate, setEndDate] = useState<Date | null>(date);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [spaceLabel, setSpaceLabel] = useState(NO_SPACE);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const hasSpaces = spaces.length > 0;
  // Default to the first space so the common case is one tap, not two.
  const activeSpace = hasSpaces
    ? (spaces.find((s) => s.label === spaceLabel) ?? spaces[0])
    : undefined;
  const maxDate = addDays(new Date(), MAX_FUTURE_DAYS);
  const isMultiDay =
    !!startDate && !!endDate && startOfDay(endDate).getTime() > startOfDay(startDate).getTime();

  const reset = () => {
    setWholeDay(false);
    setStartDate(date);
    setEndDate(date);
    setStartTime(null);
    setEndTime(null);
    setPrice('');
    setNotes('');
    setSpaceLabel(NO_SPACE);
    setError(null);
  };

  /** The concrete window, or an error message when the form is incomplete. */
  const resolveWindow = (): { start: Date; end: Date } | string => {
    if (!startDate || !endDate) return 'Pick the start and end date.';
    if (isBefore(startOfDay(endDate), startOfDay(startDate))) {
      return 'End date must be on or after the start date.';
    }
    if (wholeDay) return wholeDayWindow(startDate, endDate);
    if (!startTime || !endTime) return 'Pick the start and end time.';
    return {
      start: combineDateAndTime(startDate, startTime),
      end: combineDateAndTime(endDate, endTime),
    };
  };

  const handleAdd = async () => {
    setError(null);
    const window = resolveWindow();
    if (typeof window === 'string') {
      setError(window);
      return;
    }
    const { start, end } = window;
    if (!isAfter(end, start)) {
      setError('End must be after start.');
      return;
    }
    if (!wholeDay && isAfter(new Date(), start)) {
      setError('Start time must be in the future.');
      return;
    }
    if (isAfter(start, maxDate)) {
      setError(`Slots can only be scheduled up to ${MAX_FUTURE_DAYS} days ahead.`);
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        whole_day: wholeDay,
        price: Math.max(0, Math.round(Number(price) || 0)),
        notes,
        space_label: activeSpace?.label ?? '',
        capacity: activeSpace?.capacity ?? 0,
      });
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create slot');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
        Add availability
      </Typography>
      {isHoliday && (
        <Alert severity="error" sx={{ mt: 1 }}>
          This date is marked as a venue leave/holiday — slots cannot be added or booked.
        </Alert>
      )}
      <Stack spacing={1.5} sx={{ mt: 1, display: isHoliday ? 'none' : 'flex' }}>
        <FormControlLabel
          control={<Switch checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} />}
          label={
            <Box>
              <Typography variant="body2" fontWeight={800}>
                Whole day
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Book the entire date(s) — no time selection needed.
              </Typography>
            </Box>
          }
        />
        {hasSpaces && (
          <TextField
            select
            size="small"
            label="Space"
            value={activeSpace?.label ?? ''}
            onChange={(e) => setSpaceLabel(e.target.value)}
            helperText="Each space is booked separately — two spaces can share the same time."
          >
            {spaces.map((space) => (
              <MenuItem key={space.label} value={space.label}>
                {space.label || 'Whole venue'}
                {space.capacity > 0 ? ` · holds ${space.capacity}` : ''}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Stack direction="row" spacing={1}>
          <DatePicker
            label="Start date"
            value={startDate}
            onChange={setStartDate}
            minDate={new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          {!wholeDay && (
            <TimePicker label="Start time" value={startTime} onChange={setStartTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <DatePicker
            label="End date"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate ?? new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          {!wholeDay && (
            <TimePicker label="End time" value={endTime} onChange={setEndTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          )}
        </Stack>
        {isMultiDay && (
          <Alert severity="info">
            This creates one continuous multi-day booking (e.g. a multi-day activity or event).
          </Alert>
        )}
        <TextField
          size="small"
          type="number"
          label="Price (₹)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputProps={{ min: 0, step: 50 }}
          helperText="Leave 0 for a free slot"
        />
        <TextField size="small" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 280 }} />
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        <Button variant="contained" disabled={creating} onClick={handleAdd}>
          {creating ? 'Adding…' : 'Add slot'}
        </Button>
      </Stack>
    </Box>
  );
}
