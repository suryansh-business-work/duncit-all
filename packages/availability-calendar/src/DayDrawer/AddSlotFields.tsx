import {
  Alert,
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addDays, startOfDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { minEndTime, minTimeOn, type SlotDraft } from '../slot-draft';
import type { VenueSpace } from '../types';

export type { SlotDraft };

interface Props {
  draft: SlotDraft;
  patch: (p: Partial<SlotDraft>) => void;
  /** The venue's bookable spaces. Empty = the venue sells as one whole venue. */
  spaces: VenueSpace[];
  /** The space this slot lands in: the picked one, or the first as the default. */
  activeSpace?: VenueSpace;
  /** The current time, re-read by the form as it ticks. It bounds the pickers,
   *  so a time that has already passed today cannot even be selected. */
  now: Date;
  /** How far ahead availability may be published, in days. */
  maxFutureDays: number;
}

/** The inputs of the add-slot form. Purely presentational: it owns no state,
 *  no validation and no submit — those stay with AddSlotForm. The picker
 *  bounds below are not validation; they are what stops an invalid value from
 *  being offered at all. */
export default function AddSlotFields({
  draft,
  patch,
  spaces,
  activeSpace,
  now,
  maxFutureDays,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { wholeDay, startDate, endDate, startTime, endTime, price, notes } = draft;
  const isMultiDay =
    !!startDate && !!endDate && startOfDay(endDate).getTime() > startOfDay(startDate).getTime();
  const maxDate = addDays(now, maxFutureDays);

  /** "Court 1 · holds 4" — the capacity is what tells the two courts apart. */
  const spaceOption = (space: VenueSpace) => {
    const label = space.label || t('shell.slots.wholeVenue');
    if (space.capacity <= 0) return label;
    return t('shell.availability.spaceHolds', { vars: { label, capacity: space.capacity } });
  };

  return (
    <>
      <FormControlLabel
        control={
          <Switch checked={wholeDay} onChange={(e) => patch({ wholeDay: e.target.checked })} />
        }
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
              {t('shell.availability.wholeDayHint')}
            </Typography>
          </Box>
        }
      />
      {spaces.length > 0 && (
        <TextField
          select
          size="small"
          label={t('shell.availability.space')}
          value={activeSpace?.label ?? ''}
          onChange={(e) => patch({ spaceLabel: e.target.value })}
          helperText={t('shell.availability.spaceHint')}
        >
          {spaces.map((space) => (
            <MenuItem key={space.label} value={space.label}>
              {spaceOption(space)}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Stack direction="row" spacing={1}>
        <DatePicker
          label={t('shell.availability.startDate')}
          value={startDate}
          onChange={(next) => patch({ startDate: next })}
          minDate={now}
          maxDate={maxDate}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        {!wholeDay && (
          <TimePicker
            label={t('shell.availability.startTime')}
            value={startTime}
            onChange={(next) => patch({ startTime: next })}
            minTime={minTimeOn(startDate, now)}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <DatePicker
          label={t('shell.availability.endDate')}
          value={endDate}
          onChange={(next) => patch({ endDate: next })}
          minDate={startDate ?? now}
          maxDate={maxDate}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        {!wholeDay && (
          <TimePicker
            label={t('shell.availability.endTime')}
            value={endTime}
            onChange={(next) => patch({ endTime: next })}
            minTime={minEndTime(draft, now)}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        )}
      </Stack>
      {isMultiDay && <Alert severity="info">{t('shell.availability.multiDayHint')}</Alert>}
      <TextField
        size="small"
        type="number"
        label={t('shell.availability.price')}
        value={price}
        onChange={(e) => patch({ price: e.target.value })}
        helperText={t('shell.availability.priceHint')}
        slotProps={{
          htmlInput: { min: 0, step: 50 }
        }}
      />
      <TextField
        size="small"
        label={t('shell.availability.notes')}
        value={notes}
        onChange={(e) => patch({ notes: e.target.value })}
        slotProps={{
          htmlInput: { maxLength: 280 }
        }}
      />
    </>
  );
}
