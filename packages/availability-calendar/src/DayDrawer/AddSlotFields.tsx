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
import { startOfDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import type { VenueSpace } from '../types';

/**
 * Everything the partner fills in before a slot is sent — one object rather
 * than nine pieces of state, so the form and these fields share exactly one
 * shape and a reset is a single assignment.
 */
export interface SlotDraft {
  wholeDay: boolean;
  startDate: Date | null;
  endDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  price: string;
  notes: string;
  /** '' is a real value here (whole venue), so "not picked yet" is NO_SPACE. */
  spaceLabel: string;
}

interface Props {
  draft: SlotDraft;
  patch: (p: Partial<SlotDraft>) => void;
  /** The venue's bookable spaces. Empty = the venue sells as one whole venue. */
  spaces: VenueSpace[];
  /** The space this slot lands in: the picked one, or the first as the default. */
  activeSpace?: VenueSpace;
  /** The furthest date availability may be published to. */
  maxDate: Date;
}

/** The inputs of the add-slot form. Purely presentational: it owns no state,
 *  no validation and no submit — those stay with AddSlotForm. */
export default function AddSlotFields({
  draft,
  patch,
  spaces,
  activeSpace,
  maxDate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { wholeDay, startDate, endDate, startTime, endTime, price, notes } = draft;
  const isMultiDay =
    !!startDate && !!endDate && startOfDay(endDate).getTime() > startOfDay(startDate).getTime();

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
            <Typography variant="body2" fontWeight={800}>
              {t('shell.slots.wholeDay')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
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
          minDate={new Date()}
          maxDate={maxDate}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        {!wholeDay && (
          <TimePicker
            label={t('shell.availability.startTime')}
            value={startTime}
            onChange={(next) => patch({ startTime: next })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <DatePicker
          label={t('shell.availability.endDate')}
          value={endDate}
          onChange={(next) => patch({ endDate: next })}
          minDate={startDate ?? new Date()}
          maxDate={maxDate}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        {!wholeDay && (
          <TimePicker
            label={t('shell.availability.endTime')}
            value={endTime}
            onChange={(next) => patch({ endTime: next })}
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
        inputProps={{ min: 0, step: 50 }}
        helperText={t('shell.availability.priceHint')}
      />
      <TextField
        size="small"
        label={t('shell.availability.notes')}
        value={notes}
        onChange={(e) => patch({ notes: e.target.value })}
        inputProps={{ maxLength: 280 }}
      />
    </>
  );
}
