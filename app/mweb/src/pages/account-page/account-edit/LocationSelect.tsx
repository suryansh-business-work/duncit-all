import { useMemo, type HTMLAttributes, type Key } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import { COUNTRY_OPTIONS, findCountryByName, getStatesForCountry } from '@duncit/geo';
import type { AccountEditValues } from './account-edit.types';
import { useTranslation } from '../../../i18n/useTranslation';
import { testIdProps } from '../../../utils/testIdProps';

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

/** Keep a saved value selectable even if it is missing from the dataset. */
const withCurrent = (names: string[], current: string): string[] =>
  current && !names.includes(current) ? [current, ...names] : names;

type LocationField = 'country' | 'state' | 'city';

/** Each option carries the native SelectSheet's id: `<select>-option-<value>`. */
const optionWithTestId =
  (select: string) =>
  ({ key, ...props }: HTMLAttributes<HTMLLIElement> & { key?: Key }, option: string) => (
    <Box component="li" key={key} {...props} data-testid={`${select}-option-${option}`}>
      {option}
    </Box>
  );

/**
 * Country → State (dataset-driven — the State list depends on the Country) plus
 * a free-text City. Country/State come from the shared @duncit/geo dataset (not
 * admin locations); City is a custom value. Twin of the native LocationSelect.
 */
export default function LocationSelect({ control, setValue }: Readonly<Props>) {
  const { t } = useTranslation();
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
    <Stack data-testid="location-select" spacing={1.5}>
      <Typography data-testid="location-select-title" variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
        Location
      </Typography>
      <Autocomplete
        data-testid="location-country"
        options={countryNames}
        value={country || null}
        renderOption={optionWithTestId('location-country')}
        onChange={(_event, next) => {
          write('country', next ?? '');
          write('state', '');
          write('city', '');
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('mweb.common.country')}
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps?.htmlInput, autoComplete: 'country-name', ...testIdProps('location-country-trigger') },
            }}
          />
        )}
      />
      <Autocomplete
        data-testid="location-state"
        options={stateNames}
        value={state || null}
        disabled={!country}
        renderOption={optionWithTestId('location-state')}
        onChange={(_event, next) => write('state', next ?? '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('mweb.common.state')}
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps?.htmlInput, autoComplete: 'address-level1', ...testIdProps('location-state-trigger') },
            }}
          />
        )}
      />
      <TextField
        data-testid="location-city-field"
        label={t('mweb.common.city')}
        value={city}
        onChange={(event) => write('city', event.target.value)}
        placeholder={t('mweb.account.enterYourCity')}
        helperText={t('mweb.account.yourCityUsedToSurfacePods')}
        slotProps={{ htmlInput: { autoComplete: 'address-level2', ...testIdProps('location-city') } }}
      />
    </Stack>
  );
}
