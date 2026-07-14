import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabled?: boolean;
  size?: 'small' | 'medium';
  onBlur?: () => void;
}

/**
 * Drop-in replacement for `<TextField type="date">` using MUI X DatePicker.
 * Emits a `YYYY-MM-DD` ISO date string.
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
  onBlur,
}: Readonly<Props>) {
  const dateValue = value ? new Date(value) : null;
  const valid = dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null;

  return (
    <DatePicker
      label={label}
      value={valid}
      onChange={(d) => {
        if (!d || Number.isNaN(d.getTime())) return onChange('');
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
      }}
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
          onBlur,
        },
      }}
    />
  );
}
