import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { parseLocalDateTimeInput, toLocalDateTimeInput } from '@duncit/datetime';

/**
 * A local `YYYY-MM-DDTHH:mm` moment, read and written in the admin's configured
 * date and time patterns.
 *
 * The VALUE shape is unchanged from the `<input type="datetime-local">` this
 * replaces, because the surrounding screens compare it to decide whether a row
 * is dirty — only what the reader sees follows the setting now.
 */
export default function LocalDateTimeField({
  label,
  value,
  onChange,
  error,
  helperText,
}: Readonly<{
  label: string;
  value: string;
  onChange: (local: string) => void;
  error?: boolean;
  helperText?: string;
}>) {
  return (
    <DateTimePicker
      label={label}
      value={parseLocalDateTimeInput(value)}
      onChange={(picked) => onChange(picked ? toLocalDateTimeInput(picked) : '')}
      slotProps={{ textField: { fullWidth: true, error, helperText } }}
    />
  );
}
