import { Autocomplete, MenuItem, TextField } from '@mui/material';
import type { MappingOption } from './challenge-mapping.types';

interface MultiProps {
  label: string;
  options: MappingOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
}

/** A labelled multi-select over id/label options (tools, presets). */
export function MultiOptionPicker({ label, options, value, onChange, error, disabled }: Readonly<MultiProps>) {
  const selected = options.filter((o) => value.includes(o.id));
  return (
    <Autocomplete
      multiple
      size="small"
      disabled={disabled}
      options={options}
      value={selected}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_e, next) => onChange(next.map((o) => o.id))}
      renderInput={(params) => <TextField {...params} label={label} error={!!error} helperText={error} />}
    />
  );
}

interface SingleProps {
  label: string;
  noneLabel: string;
  options: MappingOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/** A labelled single select with an explicit "none" choice. */
export function SingleOptionPicker({ label, noneLabel, options, value, onChange, disabled }: Readonly<SingleProps>) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={options.some((o) => o.id === value) ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      fullWidth
    >
      <MenuItem value="">{noneLabel}</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
