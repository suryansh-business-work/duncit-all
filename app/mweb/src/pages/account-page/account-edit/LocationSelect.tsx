import { useMemo } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { COUNTRY_OPTIONS, findCountryByName, getStatesForCountry } from '@duncit/geo';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

/** Keep a saved value selectable even if it is missing from the dataset. */
const withCurrent = (names: string[], current: string): string[] =>
  current && !names.includes(current) ? [current, ...names] : names;

type LocationField = 'country' | 'state' | 'city';

/**
 * Country → State (dataset-driven — the State list depends on the Country) plus
 * a free-text City. Country/State come from the shared @duncit/geo dataset (not
 * admin locations); City is a custom value. Twin of the native LocationSelect.
 */
export default function LocationSelect({ control, setValue }: Readonly<Props>) {
  const country = (useWatch({ control, name: 'country' }) as string) ?? '';
  const state = (useWatch({ control, name: 'state' }) as string) ?? '';
  const city = (useWatch({ control, name: 'city' }) as string) ?? '';

  const write = (field: LocationField, value: string) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: true });

  const countryNames = useMemo(
    () => withCurrent(COUNTRY_OPTIONS.map((c) => c.name), country),
    [country],
  );
  const stateNames = useMemo(
    () =>
      withCurrent(
        getStatesForCountry(findCountryByName(country)?.isoCode).map((s) => s.name),
        state,
      ),
    [country, state],
  );

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        Location
      </Typography>
      <Autocomplete
        options={countryNames}
        value={country || null}
        onChange={(_event, next) => {
          write('country', next ?? '');
          write('state', '');
          write('city', '');
        }}
        renderInput={(params) => <TextField {...params} label="Country" />}
      />
      <Autocomplete
        options={stateNames}
        value={state || null}
        disabled={!country}
        onChange={(_event, next) => write('state', next ?? '')}
        renderInput={(params) => <TextField {...params} label="State" />}
      />
      <TextField
        label="City"
        value={city}
        onChange={(event) => write('city', event.target.value)}
        placeholder="Enter your city"
        helperText="Your city — used to surface pods and clubs near you."
      />
    </Stack>
  );
}
