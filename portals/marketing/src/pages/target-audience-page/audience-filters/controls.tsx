import type { ReactNode } from 'react';
import { Box, Checkbox, Chip, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import type { Option } from '../helpers';
import type { AudienceFilterState, TriState } from './types';
import { useTranslation } from '@duncit/app-settings';

const SMALL = { size: 'small', fullWidth: true } as const;

/** A control bound to one key of the filter state. `bind()` builds these, so
 * every control is wired the same way and no section repeats a handler. */
export interface Bound<V> {
  value: V;
  onChange: (value: V) => void;
}

type Setter = <K extends keyof AudienceFilterState>(key: K, value: AudienceFilterState[K]) => void;

/** One binder per render; every control gets its handler from here rather than
 * declaring its own inline arrow. */
export const makeBind =
  (state: AudienceFilterState, set: Setter) =>
  <K extends keyof AudienceFilterState>(name: K): Bound<AudienceFilterState[K]> => ({
    value: state[name],
    onChange: (value) => set(name, value),
  });

export function MultiSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{ label: string; options: Option[] } & Bound<string[]>>) {
  const { t } = useTranslation();
  return (
    <TextField
      {...SMALL}
      select
      label={label}
      value={value}
      // MUI types a multiple Select's value as the array it always is here.
      onChange={(e) => onChange(e.target.value as unknown as string[])}
      SelectProps={{
        multiple: true,
        renderValue: (selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(selected as string[]).map((v) => (
              <Chip key={v} label={v} size="small" />
            ))}
          </Box>
        ),
      }}
    >
      {options.length === 0 && <MenuItem disabled>{t('marketing.targetAudience.noOptionsYet')}</MenuItem>}
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          <Checkbox size="small" checked={value.includes(o.value)} />
          <ListItemText primary={o.label} />
        </MenuItem>
      ))}
    </TextField>
  );
}

export function SingleSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{ label: string; options: Option[] } & Bound<string>>) {
  return (
    <TextField {...SMALL} select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">Any</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

const triOptions = (t: Translate): Option[] => [
  { value: 'yes', label: t('marketing.targetAudience.yes') },
  { value: 'no', label: 'No' },
];

/** Unset asks nothing at all, which is not the same as asking for "no". */
export function TriStateSelect({ label, value, onChange }: Readonly<{ label: string } & Bound<TriState>>) {
  const { t } = useTranslation();
  return (
    <SingleSelect
      label={label}
      value={value}
      options={triOptions(t)}
      onChange={(v) => onChange(v as TriState)}
    />
  );
}

export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: Readonly<{ label: string; placeholder?: string } & Bound<string>>) {
  return (
    <TextField
      {...SMALL}
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RangeShell({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
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
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        {...SMALL}
        type="number"
        label={`${label} to`}
        value={to.value}
        onChange={(e) => to.onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
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
          actionBar: { actions: ['clear', 'cancel', 'accept'] },
        }}
      />
      <DatePicker
        label={`${label} to`}
        value={toDate(to.value)}
        onChange={(date) => to.onChange(toValue(date))}
        slotProps={{
          textField: { ...SMALL },
          // A date bound has to be removable again, so Clear joins the actions.
          actionBar: { actions: ['clear', 'cancel', 'accept'] },
        }}
      />
    </RangeShell>
  );
}
