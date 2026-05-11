import { Autocomplete, Stack, TextField } from '@mui/material';
import {
  COUNTRY_OPTIONS,
  findCountry,
  findCity,
  findState,
  getCitiesForState,
  getStatesForCountry,
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

export default function LocationHierarchyFields({ form, setForm }: Props) {
  const country = findCountry(form.country_code) ?? null;
  const states = getStatesForCountry(form.country_code);
  const state = findState(form.country_code, form.state_code, form.state) ?? form.state;
  const cities = getCitiesForState(form.country_code, form.state_code);
  const city = findCity(form.country_code, form.state_code, form.city) ?? form.city;

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
        <TextField
          label="Location ID"
          value={form.location_id}
          onChange={(e) => setForm({ ...form, location_id: e.target.value })}
          disabled={!!form.id}
          helperText={form.id ? 'ID cannot be changed' : 'Auto from city if blank'}
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
          value={city}
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