import { Controller, type Control } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, latestEligibleDob } from '@duncit/datetime';
import type { RegisterFormValues } from './register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
}

/** Oldest selectable birth date — a floor for the calendar, not a rule. */
const OLDEST_YEARS = 120;

const pad = (value: number) => String(value).padStart(2, '0');
/** Local calendar day as YYYY-MM-DD — `toISOString` would shift the day for any
 * timezone behind UTC and could store a date one day off. */
const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** MUIX date-of-birth picker bound to react-hook-form, storing 'YYYY-MM-DD'.
 * The calendar cannot reach a date younger than the minimum joining age, so an
 * ineligible birthday cannot be picked; the schema still re-checks it, which is
 * what catches a typed date. */
export default function DobYearField({
  control,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
}: Readonly<Props>) {
  const maxDate = latestEligibleDob(minAge);
  const minDate = new Date(maxDate.getFullYear() - OLDEST_YEARS, 0, 1);
  const hint = `You must be at least ${minAge} years old`;
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
            onChange={(d) => {
              if (!d || Number.isNaN(d.getTime())) field.onChange('');
              else field.onChange(toIsoDay(d));
            }}
            slotProps={{
              textField: {
                required: true,
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
