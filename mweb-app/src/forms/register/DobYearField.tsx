import { Controller, type Control } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { subYears } from 'date-fns';
import type { RegisterFormValues } from './register.types';

/** MUIX year-only birth-year picker bound to react-hook-form. Stores the value
 * as a 'YYYY-01-01' string so the page can build an ISO date for the server. */
export default function DobYearField({ control }: Readonly<{ control: Control<RegisterFormValues> }>) {
  const minDate = subYears(new Date(), 100);
  const maxDate = subYears(new Date(), 13);
  return (
    <Controller
      control={control}
      name="dob"
      render={({ field, fieldState }) => (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Birth year"
            views={['year']}
            openTo="year"
            value={field.value ? new Date(field.value) : null}
            minDate={minDate}
            maxDate={maxDate}
            onChange={(d) => {
              if (!d || Number.isNaN(d.getTime())) field.onChange('');
              else field.onChange(`${d.getFullYear()}-01-01`);
            }}
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
