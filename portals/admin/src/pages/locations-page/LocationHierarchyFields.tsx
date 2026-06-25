import { useEffect, useState } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import {
  COUNTRY_OPTIONS,
  findCountry,
  findState,
  getStatesForCountry,
  loadCitiesForState,
  type GeoCity,
  type GeoCountry,
  type GeoState,
} from '../../utils/geo';
import type { LocForm } from './types';

interface Props {
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
}

const label = (option: string | { name: string }) =>
  typeof option === 'string' ? option : option.name;

export default function LocationHierarchyFields({ form, setForm }: Readonly<Props>) {
  const country = findCountry(form.country_code) ?? null;
  const states = getStatesForCountry(form.country_code);
  const state = findState(form.country_code, form.state_code, form.state) ?? form.state;
  const [cities, setCities] = useState<GeoCity[]>([]);

  // Load the selected state's cities on demand (the dataset is a lazy chunk).
  useEffect(() => {
    let active = true;
    loadCitiesForState(form.country_code, form.state_code).then((next) => {
      if (active) setCities(next);
    });
    return () => {
      active = false;
    };
  }, [form.country_code, form.state_code]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Autocomplete<GeoCountry>
          options={COUNTRY_OPTIONS}
          value={country}
          autoHighlight
          getOptionLabel={(option) => `${option.flag}  ${option.name}`}
          isOptionEqualToValue={(a, b) => a.isoCode === b.isoCode}
          onChange={(_, value) =>
            setForm((prev) => ({
              ...prev,
              country: value?.name ?? '',
              country_code: value?.isoCode ?? '',
              state: '',
              state_code: '',
              city: '',
              location_name: '',
            }))
          }
          renderInput={(params) => <TextField {...params} label="Country" required />}
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Autocomplete<GeoState | string, false, false, true>
          freeSolo
          options={states}
          value={state}
          getOptionLabel={label}
          onChange={(_, value) =>
            setForm((prev) => ({
              ...prev,
              state: typeof value === 'string' ? value : value?.name ?? '',
              state_code: typeof value === 'string' ? '' : value?.isoCode ?? '',
              city: '',
              location_name: '',
            }))
          }
          onInputChange={(_, value, reason) => {
            if (reason !== 'reset') setForm((prev) => ({ ...prev, state: value, state_code: '', city: '' }));
          }}
          renderInput={(params) => <TextField {...params} label="State" required />}
          fullWidth
        />
        <Autocomplete<GeoCity | string, false, false, true>
          freeSolo
          options={cities}
          value={form.city}
          getOptionLabel={label}
          onChange={(_, value) => {
            const nextCity = typeof value === 'string' ? value : value?.name ?? '';
            setForm((prev) => ({ ...prev, city: nextCity, location_name: nextCity }));
          }}
          onInputChange={(_, value, reason) => {
            if (reason !== 'reset') setForm((prev) => ({ ...prev, city: value, location_name: value }));
          }}
          renderInput={(params) => <TextField {...params} label="City" required />}
          fullWidth
        />
      </Stack>
    </Stack>
  );
}