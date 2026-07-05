import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { cityOptions, Fieldset, localityOptions, useAdminLocations } from '@duncit/location';

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

/** City + Area/Locality grouped in a hinted Location fieldset (lead forms). */
export function LocationFieldset({ required = true }: Readonly<{ required?: boolean }>) {
  return (
    <Fieldset legend="Location" hint="Where the lead is based — city + locality (from the admin Location list).">
      <CityField name="city" label="City" required={required} />
      <AreaField name="area" cityField="city" label="Area / Locality" />
    </Fieldset>
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
