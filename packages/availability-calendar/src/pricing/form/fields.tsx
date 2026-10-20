import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { InputAdornment, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { dateToTimeOfDay, parseIsoDay, timeOfDayToDate, toIsoDay } from '@duncit/datetime';

interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  testId?: string;
}

/** A picker's test id, spread into its text field the way the slot editor does it. */
const testIdProps = (testId?: string): { 'data-testid'?: string } => (testId ? { 'data-testid': testId } : {});

/** Shown as the empty string while the owner clears it; the schema names NaN. */
const shown = (value: unknown) => (typeof value === 'number' && !Number.isNaN(value) ? value : '');

/** A number input bound to a numeric form value (empty = NaN, which the schema rejects). */
export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  testId,
  rupee = false,
  step,
}: Readonly<FieldProps<T> & { rupee?: boolean; step?: number }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputRef={ref}
          type="number"
          size="small"
          fullWidth
          label={label}
          value={shown(value)}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
          slotProps={{
            htmlInput: { step: step ?? 'any', 'data-testid': testId },
            input: rupee ? { startAdornment: <InputAdornment position="start">₹</InputAdornment> } : undefined,
          }}
        />
      )}
    />
  );
}

/** An 'HH:mm' form value on the MUI X time picker (the admin's clock format). */
export function TimeField<T extends FieldValues>({ control, name, label, testId }: Readonly<FieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TimePicker
          label={label}
          value={timeOfDayToDate(String(field.value ?? ''), '00:00')}
          onChange={(next) => field.onChange(dateToTimeOfDay(next, String(field.value ?? '')))}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? ' ',
              ...testIdProps(testId),
            },
          }}
        />
      )}
    />
  );
}

interface IsoDateProps {
  label: string;
  /** 'yyyy-MM-dd' or '' */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  minDate?: Date;
  testId?: string;
}

/** A 'yyyy-MM-dd' value on the MUI X date picker. */
export function IsoDateField({ label, value, onChange, error, minDate, testId }: Readonly<IsoDateProps>) {
  return (
    <DatePicker
      label={label}
      value={value ? parseIsoDay(value) : null}
      minDate={minDate}
      onChange={(next) => onChange(next && !Number.isNaN(next.getTime()) ? toIsoDay(next) : '')}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          error: !!error,
          helperText: error ?? ' ',
          ...testIdProps(testId),
        },
      }}
    />
  );
}
