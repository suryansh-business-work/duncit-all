import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { COUNTRIES, findCountryByDial, type Country } from '../utils/countries';

interface Props {
  value: string;
  onChange: (dial: string) => void;
  name?: string;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export default function PhoneExtensionField({
  value,
  onChange,
  name = 'phone_extension',
  label = 'Code',
  size = 'small',
  fullWidth = false,
  error,
  helperText,
  disabled,
}: Readonly<Props>) {
  const selected = findCountryByDial(value) ?? null;
  return (
    <Autocomplete<Country>
      value={selected}
      onChange={(_e, c) => onChange(c?.dial ?? '')}
      options={COUNTRIES}
      disabled={disabled}
      fullWidth={fullWidth}
      autoHighlight
      sx={{ minWidth: 130 }}
      getOptionLabel={(c) => `${c.flag} ${c.dial}`}
      isOptionEqualToValue={(a, b) => a.iso === b.iso}
      renderOption={(props, c) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
            {c.flag}
          </Box>
          <Typography variant="body2" sx={{ flex: 1 }}>
            {c.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {c.dial}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          size={size}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
}
