import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

interface RhfDateTimeFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds an ISO string, or `''` when nothing is chosen. */
  name: Path<T>;
  label: string;
  hint?: string;
}

const toDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIso = (date: Date | null): string => (date && !Number.isNaN(date.getTime()) ? date.toISOString() : '');

/**
 * An MUI X date-and-time picker bound to the form. It renders in the admin's
 * configured format through the portal's localization provider; the form keeps
 * an ISO string so the moment goes to the server unchanged. Clearable — a blank
 * value means "no limit" wherever this is used.
 */
export default function RhfDateTimeField<T extends FieldValues>({ control, name, label, hint }: Readonly<RhfDateTimeFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={toDate(field.value)}
          onChange={(date: Date | null) => field.onChange(toIso(date))}
          slotProps={{
            textField: {
              fullWidth: true,
              onBlur: field.onBlur,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message ?? hint ?? ' ',
            },
            field: { clearable: true },
          }}
        />
      )}
    />
  );
}
