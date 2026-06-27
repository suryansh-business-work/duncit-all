import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';

const LOCATIONS = gql`
  query CrmLocations {
    locations(filter: { is_active: true }) {
      id
      city
      state
      location_zones {
        zone_name
        pincode
      }
    }
  }
`;

interface LocationDoc {
  id: string;
  city: string;
  state: string;
  location_zones: { zone_name: string; pincode?: string | null }[];
}

interface CityProps {
  name: string;
  label: string;
  required?: boolean;
}

/**
 * Autocomplete-style city picker backed by the admin Location DB. The list
 * is deduplicated by city name so each city appears once even when the
 * admin has multiple entries for it (e.g. different zones). Free-text
 * values are accepted so users can type cities that are not in the DB
 * yet — important because the CRM team often picks up leads ahead of
 * Admin onboarding the city.
 */
export function CityField({ name, label, required }: Readonly<CityProps>) {
  const { control, setValue } = useFormContext();
  const { data, loading } = useQuery<{ locations: LocationDoc[] }>(LOCATIONS, { fetchPolicy: 'cache-first' });

  const options = useMemo(() => {
    const set = new Set<string>();
    for (const loc of data?.locations ?? []) {
      if (loc.city) set.add(loc.city);
    }
    return Array.from(set).sort();
  }, [data]);

  // Reset area whenever the city changes.
  const areaName = name === 'city' ? 'area' : name.replace(/city$/, 'area');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          freeSolo
          value={field.value || ''}
          options={options}
          loading={loading}
          onChange={(_, value) => {
            field.onChange(value ?? '');
            setValue(areaName, '', { shouldDirty: true });
          }}
          onInputChange={(_, value) => field.onChange(value ?? '')}
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
 * Area dropdown whose options come from the location_zones of the city
 * currently selected by `cityField`. Free-text typing is allowed so the
 * field stays useful for new cities that don't have zones in admin yet.
 */
export function AreaField({ name, cityField, label }: Readonly<AreaProps>) {
  const { control } = useFormContext();
  const city = (useWatch({ control, name: cityField }) as string) ?? '';
  const { data, loading } = useQuery<{ locations: LocationDoc[] }>(LOCATIONS, { fetchPolicy: 'cache-first' });

  const options = useMemo(() => {
    const set = new Set<string>();
    for (const loc of data?.locations ?? []) {
      if (city && loc.city.toLowerCase() !== city.toLowerCase()) continue;
      for (const zone of loc.location_zones ?? []) {
        if (zone.zone_name) set.add(zone.zone_name);
      }
    }
    return Array.from(set).sort();
  }, [data, city]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          freeSolo
          value={field.value || ''}
          options={options}
          loading={loading}
          onChange={(_, value) => field.onChange(value ?? '')}
          onInputChange={(_, value) => field.onChange(value ?? '')}
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
