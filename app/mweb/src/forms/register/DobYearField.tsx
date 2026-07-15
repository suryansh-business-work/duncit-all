import { Controller, type Control } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { RegisterFormValues } from './register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /** Admin-configured birth-year bounds (Admin > Settings). */
  minYear: number;
  maxYear: number;
}

/** MUIX year-only birth-year picker bound to react-hook-form. Stores the value
 * as a 'YYYY-01-01' string so the page can build an ISO date for the server. The
 * selectable range + hint follow the admin-configured min/max birth year. */
export default function DobYearField({ control, minYear, maxYear }: Readonly<Props>) {
  const minDate = new Date(minYear, 0, 1);
  const maxDate = new Date(maxYear, 11, 31);
  const hint = `Between ${minYear} and ${maxYear}`;
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
                helperText: fieldState.error?.message ?? hint,
              },
            }}
          />
        </LocalizationProvider>
      )}
    />
  );
}
