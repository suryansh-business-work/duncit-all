import { Box, Checkbox, Chip, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Option } from '../helpers';
import type { AudienceFilterState, TriState } from './types';

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
      {options.length === 0 && <MenuItem disabled>No options yet</MenuItem>}
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

const TRI_OPTIONS: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** Unset asks nothing at all, which is not the same as asking for "no". */
export function TriStateSelect({ label, value, onChange }: Readonly<{ label: string } & Bound<TriState>>) {
  return (
    <SingleSelect
      label={label}
      value={value}
      options={TRI_OPTIONS}
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

export function RangeFilter({
  label,
  type,
  from,
  to,
}: Readonly<{ label: string; type: 'number' | 'date'; from: Bound<string>; to: Bound<string> }>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          {...SMALL}
          type={type}
          label={`${label} from`}
          value={from.value}
          onChange={(e) => from.onChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          {...SMALL}
          type={type}
          label={`${label} to`}
          value={to.value}
          onChange={(e) => to.onChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Stack>
  );
}
