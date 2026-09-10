import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from '@mui/material';
import { weekdayLabels } from '@duncit/slots';
import { useTranslation } from '@duncit/shell';
import { Controller, type Control } from 'react-hook-form';
import type { VenueFormValues } from '../types';

/**
 * The days the venue is closed every week, as 0..6 (Sun..Sat) — the shape the
 * slot generator reads.
 *
 * The weekday NAMES come from `weekdayLabels(t)` in `@duncit/slots`, the same
 * seven the availability calendar prints, so "Tuesday" is one string across the
 * product rather than one per screen (rule 34).
 */
export default function WeeklyOffField({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();
  const weekdays = weekdayLabels(t).full;
  const label = t('directory.venueEditor.weeklyOff');

  return (
    <Controller
      control={control}
      name="settings.weekly_off_days"
      render={({ field }) => {
        const picked = field.value ?? [];
        return (
          <FormControl size="small" fullWidth>
            <InputLabel id="venue-weekly-off-label">{label}</InputLabel>
            <Select
              labelId="venue-weekly-off-label"
              multiple
              label={label}
              value={picked}
              onChange={(event) => field.onChange(event.target.value as number[])}
              renderValue={(value) => (value as number[]).map((day) => weekdays[day]).join(', ')}
            >
              {weekdays.map((day, index) => (
                <MenuItem key={day} value={index}>
                  <Checkbox size="small" checked={picked.includes(index)} />
                  <ListItemText primary={day} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }}
    />
  );
}
