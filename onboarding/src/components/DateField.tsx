import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useDateFormat } from '../utils/dateFormat';

interface Props {
  label: string;
  /** ISO date string (YYYY-MM-DD or full ISO), may be empty. */
  value: string;
  /** Called with ISO date string `YYYY-MM-DD` (or empty when cleared). */
  onChange: (iso: string) => void;
  required?: boolean;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Drop-in replacement for `<TextField type="date">` that uses the
 * MUI X `DatePicker` and respects the global date format.
 */
export default function DateField({
  label,
  value,
  onChange,
  required,
  fullWidth = true,
  error,
  helperText,
  minDate,
  maxDate,
  disabled,
  size,
}: Props) {
  const { dateFormat } = useDateFormat();
  const dateValue = value ? new Date(value) : null;
  const valid = dateValue && !isNaN(dateValue.getTime()) ? dateValue : null;

  return (
    <DatePicker
      label={label}
      value={valid}
      onChange={(d) => {
        if (!d || isNaN(d.getTime())) return onChange('');
        // Date-only: keep YYYY-MM-DD locally to avoid timezone drift.
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
      }}
      format={dateFormat}
      minDate={minDate ?? undefined}
      maxDate={maxDate ?? undefined}
      disabled={disabled}
      slotProps={{
        textField: {
          fullWidth,
          required,
          error,
          helperText,
          size,
        },
      }}
    />
  );
}
