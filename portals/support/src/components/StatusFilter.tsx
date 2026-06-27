import { MenuItem, TextField } from '@mui/material';

export interface StatusOption<T extends string> {
  value: T | 'ALL';
  label: string;
}

interface Props<T extends string> {
  value: T | 'ALL';
  options: ReadonlyArray<StatusOption<T>>;
  onChange: (value: T | 'ALL') => void;
  label?: string;
}

/** A compact MUI status filter dropdown (top-right of a list). "ALL" means no
 * server-side status filter; selecting any other value drives the query's
 * `status` argument so the list refreshes without a page reload. */
export default function StatusFilter<T extends string>({
  value,
  options,
  onChange,
  label = 'Filter',
}: Readonly<Props<T>>) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T | 'ALL')}
      sx={{ minWidth: 160 }}
    >
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
