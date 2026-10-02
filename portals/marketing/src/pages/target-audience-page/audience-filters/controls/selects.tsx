import { Box, Checkbox, Chip, ListItemText, MenuItem, TextField } from '@mui/material';
import type { Option } from '../../helpers';
import type { TriState } from '../types';
import { useTranslation } from '@duncit/app-settings';
import { SMALL, type Bound } from './bind';

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
      // MUI types a multiple Select's value as a string; at runtime it is always the array.
      onChange={(e) => onChange(e.target.value as unknown as string[])} // NOSONAR — S4325: the cast is required
      slotProps={{
        select: {
          multiple: true,
          renderValue: (selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((v) => (
                <Chip key={v} label={v} size="small" />
              ))}
            </Box>
          ),
        }
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
