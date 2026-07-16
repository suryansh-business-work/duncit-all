import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useDateFormat } from '@duncit/app-settings';

interface Props {
  label: string;
  /** ISO string value, may be empty. */
  value: string;
  /** Called with ISO string (or empty string when cleared). */
  onChange: (iso: string) => void;
  required?: boolean;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  minDateTime?: Date | null;
  disabled?: boolean;
}

/**
 * Drop-in replacement for `<TextField type="datetime-local">` that uses the
 * MUI X `DateTimePicker` and respects the global date/time format.
 */
export default function DateTimeField({
  label,
  value,
  onChange,
  required,
  fullWidth = true,
  error,
  helperText,
  minDateTime,
  disabled,
}: Readonly<Props>) {
  const { dateFormat, timeFormat } = useDateFormat();
  const dateValue = value ? new Date(value) : null;
  const valid = dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null;

  return (
    <DateTimePicker
      label={label}
      value={valid}
      onChange={(d) => onChange(d ? d.toISOString() : '')}
      format={`${dateFormat} ${timeFormat}`}
      minDateTime={minDateTime ?? undefined}
      disabled={disabled}
      slotProps={{
        textField: {
          fullWidth,
          required,
          error,
          helperText,
        },
      }}
    />
  );
}
