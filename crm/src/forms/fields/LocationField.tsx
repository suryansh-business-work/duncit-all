import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useField, useFormikContext } from 'formik';
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
export function CityField({ name, label, required }: CityProps) {
  const [field, meta] = useField<string>(name);
  const formik = useFormikContext<Record<string, unknown>>();
  const { data, loading } = useQuery<{ locations: LocationDoc[] }>(LOCATIONS, { fetchPolicy: 'cache-first' });

  const options = useMemo(() => {
    const set = new Set<string>();
    for (const loc of data?.locations ?? []) {
      if (loc.city) set.add(loc.city);
    }
    return Array.from(set).sort();
  }, [data]);

  const showError = Boolean(meta.error && (meta.touched || meta.value !== meta.initialValue));

  return (
    <Autocomplete
      freeSolo
      value={field.value || ''}
      options={options}
      loading={loading}
      onChange={(_, value) => {
        formik.setFieldValue(name, value ?? '');
        // Reset area whenever the city changes.
        formik.setFieldValue(name === 'city' ? 'area' : `${name.replace(/city$/, 'area')}`, '');
      }}
      onInputChange={(_, value) => formik.setFieldValue(name, value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size="small"
          error={showError}
          helperText={showError ? (meta.error as string) : ' '}
          onBlur={field.onBlur}
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
export function AreaField({ name, cityField, label }: AreaProps) {
  const [field, meta] = useField<string>(name);
  const formik = useFormikContext<Record<string, any>>();
  const city = (formik.values[cityField] ?? '') as string;
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

  const showError = Boolean(meta.error && (meta.touched || meta.value !== meta.initialValue));

  return (
    <Autocomplete
      freeSolo
      value={field.value || ''}
      options={options}
      loading={loading}
      onChange={(_, value) => formik.setFieldValue(name, value ?? '')}
      onInputChange={(_, value) => formik.setFieldValue(name, value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          error={showError}
          helperText={showError ? (meta.error as string) : ' '}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}
