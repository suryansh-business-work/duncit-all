import { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { addDays, isAfter, isBefore, set as setTimeOnDate, startOfDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { wholeDayWindow } from './slot-window';
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

/** One day's window: the daily times, or the whole day when the toggle is on
 * (today's whole day starts a few minutes from now, not at a past midnight). */
function dayWindow(day: Date, wholeDay: boolean, startTime: Date | null, endTime: Date | null, now: Date) {
  if (wholeDay) return wholeDayWindow(day, day, now);
  return {
    start: combineDateAndTime(day, startTime as Date),
    end: combineDateAndTime(day, endTime as Date),
  };
}

// One slot per day across [start, end] with the same daily window (or the whole
// day); past windows are skipped so a range that starts today still works.
function buildRecurringSlots(
  startDate: Date,
  endDate: Date,
  wholeDay: boolean,
  startTime: Date | null,
  endTime: Date | null,
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
    const { start, end } = dayWindow(cursor, wholeDay, startTime, endTime, now);
    if (isAfter(end, start) && isAfter(start, now) && !isAfter(start, maxStart)) {
      slots.push({
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        whole_day: wholeDay,
        price,
        notes: '',
      });
    }
    cursor = addDays(cursor, 1);
  }
  return slots;
}

/** Bulk-add a daily availability window across a date range at one price. The
 *  host wires onAdd (which calls the bulk-create API). Prop-driven + reusable. */
export default function RecurringAvailabilityDialog({ open, onClose, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const [wholeDay, setWholeDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const maxDate = addDays(new Date(), MAX_FUTURE_DAYS);

  const reset = () => {
    setWholeDay(false);
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
    if (!startDate || !endDate) return t('shell.availability.pickDates');
    if (isBefore(endDate, startDate)) return t('shell.availability.endDateAfterStart');
    if (wholeDay) return null;
    if (!startTime || !endTime) return t('shell.availability.pickTimes');
    if (!isAfter(combineDateAndTime(startDate, endTime), combineDateAndTime(startDate, startTime))) {
      return t('shell.availability.dailyEndAfterStart');
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
      wholeDay,
      startTime,
      endTime,
      Math.max(0, Math.round(Number(price) || 0)),
    );
    if (slots.length === 0) {
      setError(t('shell.availability.noUpcomingSlots'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(slots);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('shell.availability.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900, pr: 6 }}>
        {t('shell.availability.recurringTitle')}
        <DuncitIconButton
          onClick={handleClose}
          aria-label={t('shell.common.close')}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('shell.availability.recurringHint', { vars: { days: MAX_FUTURE_DAYS } })}
          </Typography>
          <FormControlLabel
            control={<Switch checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} />}
            label={
              <Box>
                <Typography variant="body2" sx={{
                  fontWeight: 800
                }}>
                  {t('shell.slots.wholeDay')}
                </Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {t('shell.availability.recurringWholeDayHint')}
                </Typography>
              </Box>
            }
          />
          <DatePicker
            label={t('shell.availability.startDate')}
            value={startDate}
            onChange={setStartDate}
            minDate={new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <DatePicker
            label={t('shell.availability.endDate')}
            value={endDate}
            onChange={setEndDate}
            minDate={startDate ?? new Date()}
            maxDate={maxDate}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          {!wholeDay && (
            <Stack direction="row" spacing={1}>
              <TimePicker
                label={t('shell.availability.dailyStart')}
                value={startTime}
                onChange={setStartTime}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <TimePicker
                label={t('shell.availability.dailyEnd')}
                value={endTime}
                onChange={setEndTime}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Stack>
          )}
          <TextField
            size="small"
            type="number"
            label={t('shell.availability.price')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            helperText={t('shell.availability.recurringPriceHint')}
            slotProps={{
              htmlInput: { min: 0, step: 50 }
            }}
          />
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <DuncitButton onClick={handleClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" disabled={saving} onClick={handleAdd}>
          {saving ? t('shell.availability.adding') : t('shell.availability.addToCalendar')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
