import { memo } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
}

/** One filter of the board's bar — "Any" plus the options, an empty value for any. */
export const FilterSelect = memo(function FilterSelect({ label, value, options, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  // A value from a pasted link that is no longer offered still shows, by its raw value.
  const known = value === '' || options.some((option) => option.value === value);
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: (theme) => theme.spacing(18) }}
    >
      <MenuItem value="">{t('testsManual.filters.any')}</MenuItem>
      {known ? null : <MenuItem value={value}>{value}</MenuItem>}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
});
