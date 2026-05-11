import { Autocomplete, Box, TextField } from '@mui/material';
import type { Step1 } from './queries';

interface Props {
  s1: Step1;
  locations: any[];
  set: (patch: Partial<Step1>) => void;
}

interface NamedOption {
  name: string;
  code: string;
}

const cityName = (location: any) => location.city || location.location_name || '';

const uniqueOptions = (items: NamedOption[]) => {
  const byKey = new Map<string, NamedOption>();
  items.forEach((item) => {
    const key = item.code || item.name;
    if (key && !byKey.has(key)) byKey.set(key, item);
  });
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const selectedLocation = (locations: any[], s1: Step1) =>
  locations.find((item) => item.id === s1.location_id) ??
  locations.find(
    (item) =>
      cityName(item) === s1.city &&
      (!s1.state || item.state === s1.state) &&
      (!s1.country_code || item.country_code === s1.country_code)
  ) ??
  null;

export default function VenueLocationFields({ s1, locations, set }: Props) {
  const location = selectedLocation(locations, s1);
  const countryOptions = uniqueOptions(
    locations.map((item) => ({ name: item.country || item.country_code, code: item.country_code }))
  );
  const stateLocations = s1.country_code
    ? locations.filter((item) => item.country_code === s1.country_code)
    : locations;
  const stateOptions = uniqueOptions(
    stateLocations.map((item) => ({ name: item.state || item.state_code, code: item.state_code || item.state }))
  );
  const cityOptions = stateLocations
    .filter((item) => !s1.state || item.state === s1.state)
    .sort((a, b) => cityName(a).localeCompare(cityName(b)));
  const zones = location?.location_zones ?? [];
  const zone = zones.find((item: any) => item.zone_name === s1.locality) ?? null;

  const chooseLocation = (next: any | null) => {
    if (!next) return set({ location_id: '', city: '', locality: '', postal_code: '' });
    set({
      location_id: next.id,
      country: next.country || 'India',
      country_code: next.country_code || 'IN',
      state: next.state || '',
      state_code: next.state_code || '',
      city: cityName(next),
      locality: next.location_zones?.length ? '' : cityName(next),
      postal_code: next.location_zones?.length ? '' : next.location_pincode || '',
    });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <Autocomplete
        options={countryOptions}
        value={s1.country_code ? { name: s1.country || s1.country_code, code: s1.country_code } : null}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        onChange={(_, value) => set({ country: value?.name ?? '', country_code: value?.code ?? '', state: '', state_code: '', location_id: '', city: '', locality: '', postal_code: '' })}
        renderInput={(params) => <TextField {...params} label="Country *" size="small" />}
      />
      <Autocomplete
        options={stateOptions}
        value={s1.state ? { name: s1.state, code: s1.state_code || s1.state } : null}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        disabled={!s1.country_code}
        onChange={(_, value) => set({ state: value?.name ?? '', state_code: value?.code ?? '', location_id: '', city: '', locality: '', postal_code: '' })}
        renderInput={(params) => <TextField {...params} label="State *" size="small" />}
      />
      <Autocomplete
        options={cityOptions}
        value={location}
        getOptionLabel={cityName}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={!s1.state}
        onChange={(_, value) => chooseLocation(value)}
        renderInput={(params) => <TextField {...params} label="City *" size="small" />}
      />
      <Autocomplete
        options={zones}
        value={zone}
        getOptionLabel={(option) => option.zone_name}
        isOptionEqualToValue={(a, b) => a.zone_name === b.zone_name}
        disabled={!location || zones.length === 0}
        onChange={(_, value) => set({ locality: value?.zone_name ?? '', postal_code: value?.pincode || location?.location_pincode || '' })}
        renderInput={(params) => <TextField {...params} label="Locality / Area *" size="small" />}
      />
      <TextField label="PIN code *" size="small" value={s1.postal_code} InputProps={{ readOnly: true }} />
    </Box>
  );
}
