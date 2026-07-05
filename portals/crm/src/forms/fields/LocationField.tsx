import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { cityOptions, localityOptions, useAdminLocations } from '@duncit/location';

interface CityProps {
  name: string;
  label: string;
  required?: boolean;
}

/**
 * Strict city picker backed by the admin Location DB (the shared @duncit/location
 * source). Only admin-managed cities are selectable — no free-text — so CRM data
 * stays in sync with every other console.
 */
export function CityField({ name, label, required }: Readonly<CityProps>) {
  const { control, setValue } = useFormContext();
  const { locations, loading } = useAdminLocations();

  const options = useMemo(
    () => cityOptions(locations, '', '').map((option) => option.value),
    [locations],
  );

  // Reset the paired area whenever the city changes.
  const areaName = name === 'city' ? 'area' : name.replace(/city$/, 'area');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          value={field.value || null}
          options={options}
          loading={loading}
          onChange={(_, value) => {
            field.onChange(value ?? '');
            setValue(areaName, '', { shouldDirty: true });
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              size="small"
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
    />
  );
}

interface AreaProps {
  name: string;
  cityField: string;
  label: string;
}

/**
 * Strict area/locality dropdown whose options are the zones of the admin
 * Location doc matching the city selected in `cityField`.
 */
export function AreaField({ name, cityField, label }: Readonly<AreaProps>) {
  const { control } = useFormContext();
  const city = (useWatch({ control, name: cityField }) as string) ?? '';
  const { locations, loading } = useAdminLocations();

  const options = useMemo(() => {
    const doc = locations.find((loc) => loc.city?.toLowerCase() === city.toLowerCase());
    return doc ? localityOptions(locations, doc.id).map((option) => option.value) : [];
  }, [locations, city]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          value={field.value || null}
          options={options}
          loading={loading}
          disabled={!city}
          onChange={(_, value) => field.onChange(value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              size="small"
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
    />
  );
}
