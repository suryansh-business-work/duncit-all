import { Autocomplete, Box, TextField, Typography, type SxProps, type Theme } from '@mui/material';
import type { ChangeEvent } from 'react';
import { COUNTRIES, findCountryByDial, type Country } from '../utils/countries';

interface Props {
  value: string;
  onChange: (dial: string) => void;
  onBlur?: (e: ChangeEvent<any>) => void;
  name?: string;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  textFieldSx?: SxProps<Theme>;
}

export default function PhoneExtensionField({
  value,
  onChange,
  onBlur,
  name = 'phone_extension',
  label = 'Code',
  size = 'small',
  fullWidth = true,
  error,
  helperText,
  disabled,
  sx,
  textFieldSx,
}: Readonly<Props>) {
  const selected = findCountryByDial(value) ?? null;
  return (
    <Autocomplete<Country>
      value={selected}
      onChange={(_e, c) => onChange(c?.dial ?? '')}
      onBlur={onBlur}
      options={COUNTRIES}
      sx={{
        '& .MuiAutocomplete-inputRoot': { minHeight: 56, flexWrap: 'nowrap' },
        '& .MuiAutocomplete-input': { minWidth: '50px !important' },
        '& .MuiAutocomplete-endAdornment': { right: 10 },
        ...(Array.isArray(sx) ? {} : sx),
      }}
      disabled={disabled}
      fullWidth={fullWidth}
      autoHighlight
      getOptionLabel={(c) => `${c.iso} ${c.dial}`}
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
          InputLabelProps={{ shrink: true }}
          sx={textFieldSx}
        />
      )}
    />
  );
}
