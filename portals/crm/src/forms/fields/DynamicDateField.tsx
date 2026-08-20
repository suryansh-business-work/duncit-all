import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';

/**
 * A `kind: 'date'` custom field. The stored value stays 'YYYY-MM-DD'; the box
 * reads in the admin's configured pattern, inherited from the shell's
 * DuncitLocalizationProvider. It was a `<TextField type="date">`, which shows
 * the reader's browser order and so disagreed with the lead's other dates.
 */
export default function DynamicDateField({
  label,
  hint,
  required,
  value,
  onChange,
}: Readonly<{
  label: string;
  hint?: string;
  required?: boolean;
  /** 'YYYY-MM-DD', or '' when unset. */
  value: string;
  onChange: (day: string) => void;
}>) {
  return (
    <DatePicker
      label={label}
      value={parseIsoDay(value)}
      onChange={(picked) => onChange(picked ? toIsoDay(picked) : '')}
      slotProps={{ textField: { fullWidth: true, size: 'small', helperText: hint, required } }}
    />
  );
}
