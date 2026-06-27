import { Controller, type Control, type Path } from 'react-hook-form';
import { Autocomplete, Box, TextField } from '@mui/material';
import { COUNTRY_CODES, countryByDial, type CountryCode } from './country-codes';
import { countryFlagUrl } from '../../../utils/location-tree';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  name: Path<AccountEditValues>;
  label: string;
  disabled?: boolean;
}

const matches = (option: CountryCode, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.name.toLowerCase().includes(q) ||
    option.dial.includes(q) ||
    option.iso2.includes(q)
  );
};

/**
 * Searchable country-dial-code dropdown (bug 4) bound to react-hook-form. The
 * field stores the dial string (e.g. '+91'); the box can be searched by country
 * name or code. An off-list value is preserved in form state (just not shown).
 */
export default function CountryCodeField({ control, name, label, disabled }: Readonly<Props>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={COUNTRY_CODES}
          value={countryByDial(String(field.value ?? '')) ?? null}
          disabled={disabled}
          getOptionLabel={(option) => option.dial}
          isOptionEqualToValue={(option, value) => option.iso2 === value.iso2}
          filterOptions={(options, state) => options.filter((o) => matches(o, state.inputValue))}
          onChange={(_event, option) => field.onChange(option?.dial ?? '')}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.iso2} sx={{ gap: 1 }}>
              <Box
                component="img"
                src={countryFlagUrl(option.iso2)}
                alt=""
                sx={{ width: 22, height: 16, borderRadius: 0.5 }}
              />
              {option.name}
              <Box component="span" sx={{ ml: 'auto', color: 'text.secondary' }}>
                {option.dial}
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              size="small"
              onBlur={field.onBlur}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
            />
          )}
          sx={{ minWidth: 132 }}
        />
      )}
    />
  );
}
