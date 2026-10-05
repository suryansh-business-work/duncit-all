import { useEffect, useMemo, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Autocomplete, Box, TextField } from '@mui/material';
import { COUNTRY_OPTIONS, getStatesForCountry, type GeoCountry, type GeoState } from '@duncit/geo';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { loadCityNames } from '../../../lib/geo-cities';
import { TWO_COLUMNS } from '../../../lib/layout';
import { stateCodeFor, type ServiceablePincodeValues } from './serviceable-pincode.types';

interface PincodePlaceFieldsProps {
  form: UseFormReturn<ServiceablePincodeValues>;
}

const stateLabel = (option: GeoState | string) => (typeof option === 'string' ? option : option.name);
const CHANGED = { shouldDirty: true } as const;

/**
 * Country → State → City, each step unlocked by the one before it and cleared
 * when it changes — the same chain Admin › Locations uses to add a city.
 */
export default function PincodePlaceFields({ form }: Readonly<PincodePlaceFieldsProps>) {
  const { t } = useTranslation();
  const { control, setValue } = form;
  const [countryCode, state, stateCode] = useWatch({ control, name: ['country_code', 'state', 'state_code'] });
  const states = useMemo(() => getStatesForCountry(countryCode), [countryCode]);
  const [cities, setCities] = useState<string[]>([]);

  // The selected state's cities, loaded on demand (the dataset is a lazy chunk).
  useEffect(() => {
    let active = true;
    loadCityNames(countryCode, stateCode)
      .then((next) => {
        if (active) setCities(next);
      })
      .catch((error: unknown) => {
        // City stays free text, so the form still works without the list.
        logs.portal['ecomm-portal'].warn('serviceable-pincodes', 'PincodePlaceFields', { error, countryCode, stateCode });
        if (active) setCities([]);
      });
    return () => {
      active = false;
    };
  }, [countryCode, stateCode]);

  const setState = (name: string, code: string) => {
    setValue('state', name, { ...CHANGED, shouldValidate: true });
    setValue('state_code', code, CHANGED);
    setValue('city', '', CHANGED);
  };

  return (
    <>
      <Controller
        control={control}
        name="country_code"
        render={({ field, fieldState }) => (
          <Autocomplete<GeoCountry>
            options={COUNTRY_OPTIONS}
            value={COUNTRY_OPTIONS.find((country) => country.isoCode === field.value) ?? null}
            autoHighlight
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(a, b) => a.isoCode === b.isoCode}
            onChange={(_event, value) => {
              field.onChange(value?.isoCode ?? '');
              setState('', '');
            }}
            onBlur={field.onBlur}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                label={t('ecommPortal.serviceablePincodes.country')}
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
            data-testid="serviceable-pincode-country"
          />
        )}
      />
      <Box sx={TWO_COLUMNS}>
        <Controller
          control={control}
          name="state"
          render={({ field, fieldState }) => (
            <Autocomplete<GeoState | string, false, false, true>
              freeSolo
              options={states}
              value={field.value}
              disabled={!countryCode}
              getOptionLabel={stateLabel}
              onChange={(_event, value) => {
                if (typeof value === 'string') setState(value, stateCodeFor(countryCode, value));
                else setState(value?.name ?? '', value?.isoCode ?? '');
              }}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input') setState(value, stateCodeFor(countryCode, value));
              }}
              onBlur={field.onBlur}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  label={t('ecommPortal.serviceablePincodes.state')}
                  required
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
              data-testid="serviceable-pincode-state"
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field, fieldState }) => (
            <Autocomplete<string, false, false, true>
              freeSolo
              options={cities}
              value={field.value}
              disabled={!state.trim()}
              onChange={(_event, value) => field.onChange(value ?? '')}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input') field.onChange(value);
              }}
              onBlur={field.onBlur}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  label={t('ecommPortal.serviceablePincodes.city')}
                  required
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
              data-testid="serviceable-pincode-city"
            />
          )}
        />
      </Box>
    </>
  );
}
