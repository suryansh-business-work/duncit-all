import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * A stored 'yyyy-MM-dd' date, edited through an MUI X picker (rule 11).
 *
 * The value stays a DAY string on the form because that is what the venue
 * stores — a date of birth and a stop date are calendar days, and turning them
 * into instants would move them across midnight for anyone in another zone.
 * The picker renders in the admin-configured pattern via the surface's
 * `DuncitLocalizationProvider`, so nothing here names a format.
 */
export interface RhfDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  minDate?: Date;
  maxDate?: Date;
}

const DAY = 'yyyy-MM-dd';

export default function RhfDateField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  minDate,
  maxDate,
}: Readonly<RhfDateFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const raw = (field.value as string) ?? '';
        const parsed = raw ? parseISO(raw) : null;
        return (
          <DatePicker
            label={label}
            value={parsed && isValid(parsed) ? parsed : null}
            onChange={(next) => field.onChange(next && isValid(next) ? format(next, DAY) : '')}
            minDate={minDate}
            maxDate={maxDate}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? hint ?? ' ',
                onBlur: field.onBlur,
              },
            }}
          />
        );
      }}
    />
  );
}
