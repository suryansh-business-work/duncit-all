import { Controller, type Control } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subYears } from 'date-fns';
import type { AccountEditValues } from './account-edit.types';

/**
 * Full date-of-birth picker (bug 1) — opens on the year so the birth year can be
 * picked fast, then month and day, and the text field stays editable so the year
 * can also be typed. Stores the value as a 'YYYY-MM-DD' string; future dates are
 * blocked and the range is capped at 120 years.
 */
export default function DobDateField({ control }: Readonly<{ control: Control<AccountEditValues> }>) {
  const maxDate = new Date();
  const minDate = subYears(maxDate, 120);
  return (
    <Controller
      control={control}
      name="dob"
      render={({ field, fieldState }) => (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Date of birth"
            openTo="year"
            views={['year', 'month', 'day']}
            value={field.value ? new Date(field.value) : null}
            minDate={minDate}
            maxDate={maxDate}
            onChange={(d) =>
              field.onChange(d && !Number.isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : '')
            }
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                onBlur: field.onBlur,
                InputLabelProps: { shrink: true },
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? ' ',
              },
            }}
          />
        </LocalizationProvider>
      )}
    />
  );
}
