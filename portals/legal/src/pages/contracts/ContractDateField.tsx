import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';

/**
 * A contract effective date. Holds 'YYYY-MM-DD' either way — only the reading
 * changes, to the admin's configured pattern (inherited from the shell's
 * DuncitLocalizationProvider). It was a `<TextField type="date">`, which shows
 * whatever order the reader's browser is set to.
 */
export default function ContractDateField({
  label,
  value,
  onChange,
  disabled,
}: Readonly<{
  label: string;
  /** 'YYYY-MM-DD', or '' when unset. */
  value: string;
  onChange: (day: string) => void;
  disabled?: boolean;
}>) {
  return (
    <DatePicker
      label={label}
      value={parseIsoDay(value)}
      onChange={(picked) => onChange(picked ? toIsoDay(picked) : '')}
      disabled={disabled}
      slotProps={{ textField: { fullWidth: true } }}
    />
  );
}
