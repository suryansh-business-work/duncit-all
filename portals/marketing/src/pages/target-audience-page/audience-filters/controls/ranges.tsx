import type { ReactNode } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { SMALL, type Bound } from './bind';

function RangeShell({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack spacing={0.75}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1}>
        {children}
      </Stack>
    </Stack>
  );
}

export function NumberRange({
  label,
  from,
  to,
}: Readonly<{ label: string; from: Bound<string>; to: Bound<string> }>) {
  return (
    <RangeShell label={label}>
      <TextField
        {...SMALL}
        type="number"
        label={`${label} from`}
        value={from.value}
        onChange={(e) => from.onChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: true }
        }}
      />
      <TextField
        {...SMALL}
        type="number"
        label={`${label} to`}
        value={to.value}
        onChange={(e) => to.onChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: true }
        }}
      />
    </RangeShell>
  );
}

/** The filter state keeps plain 'yyyy-MM-dd' strings; the picker works in
 * Dates. An in-progress or nonsense date simply clears the bound rather than
 * sending the server an Invalid Date. */
const toDate = (value: string) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};
const toValue = (date: Date | null) => (date && isValid(date) ? format(date, 'yyyy-MM-dd') : '');

export function DateRange({
  label,
  from,
  to,
}: Readonly<{ label: string; from: Bound<string>; to: Bound<string> }>) {
  return (
    <RangeShell label={label}>
      {/* MUIX pickers, per rule 11 — a native date input has no calendar. */}
      <DatePicker
        label={`${label} from`}
        value={toDate(from.value)}
        onChange={(date) => from.onChange(toValue(date))}
        slotProps={{
          textField: { ...SMALL },
          // A date bound has to be removable again, so Clear joins the actions.
          actionBar: { actions: ['clear', 'cancel', 'accept'] }}}
      />
      <DatePicker
        label={`${label} to`}
        value={toDate(to.value)}
        onChange={(date) => to.onChange(toValue(date))}
        slotProps={{
          textField: { ...SMALL },
          // A date bound has to be removable again, so Clear joins the actions.
          actionBar: { actions: ['clear', 'cancel', 'accept'] }}}
      />
    </RangeShell>
  );
}
