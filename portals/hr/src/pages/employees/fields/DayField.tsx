import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { Controller, useFormContext, type FieldValues } from 'react-hook-form';

/**
 * A stored `YYYY-MM-DD` day edited through an MUI X picker. The value stays a
 * DAY string because that is what HR stores — a birth or joining date is a
 * calendar day, and an instant would move it across midnight in another zone.
 * The picker renders in the admin's date pattern through the console's
 * localization provider, so nothing here names a format.
 *
 * Same contract as entity-consoles' RhfDateField; it reads the form from
 * context so the HR field groups can sit inside any HR form. (Two users, so it
 * stays local until a third needs it — rule 5.)
 */
interface Props {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  testId?: string;
}

const DAY = 'yyyy-MM-dd';

export default function DayField({ name, label, hint, required, disabled, minDate, maxDate, testId }: Readonly<Props>) {
  const { control } = useFormContext<FieldValues>();
  const testIdProps = testId ? { 'data-testid': testId } : undefined;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const raw = typeof field.value === 'string' ? field.value : '';
        const parsed = raw ? parseISO(raw) : null;
        return (
          <DatePicker
            label={label}
            value={parsed && isValid(parsed) ? parsed : null}
            onChange={(next) => field.onChange(next && isValid(next) ? format(next, DAY) : '')}
            minDate={minDate}
            maxDate={maxDate}
            disabled={disabled}
            slotProps={{
              field: { clearable: !required },
              textField: {
                fullWidth: true,
                required,
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? hint ?? ' ',
                onBlur: field.onBlur,
                inputRef: field.ref,
                slotProps: { htmlInput: testIdProps },
              },
            }}
          />
        );
      }}
    />
  );
}
