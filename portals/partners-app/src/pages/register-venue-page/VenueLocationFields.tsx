import { Autocomplete, Box, TextField } from '@mui/material';
import type { VenueLocationValues } from './register-venue/register-venue.types';

interface Props {
  value: VenueLocationValues;
  locations: any[];
  onChange: (next: VenueLocationValues) => void;
  errors?: Partial<Record<keyof VenueLocationValues, string>>;
  showAllErrors?: boolean;
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

export const findSelectedLocation = (locations: any[], value: VenueLocationValues) =>
  locations.find((item) => item.id === value.location_id) ??
  locations.find(
    (item) =>
      cityName(item) === value.city &&
      (!value.state || item.state === value.state) &&
      (!value.country_code || item.country_code === value.country_code)
  ) ??
  null;

export default function VenueLocationFields({ value, locations, onChange, errors, showAllErrors }: Readonly<Props>) {
  const selectedLocation = findSelectedLocation(locations, value);
  const selectedCountry = value.country_code
    ? { name: value.country || value.country_code, code: value.country_code }
    : null;
  const countryOptions = uniqueOptions(
    locations.map((item) => ({ name: item.country || item.country_code, code: item.country_code }))
  );
  const countryLocations = value.country_code
    ? locations.filter((item) => item.country_code === value.country_code)
    : locations;
  const selectedState = value.state ? { name: value.state, code: value.state_code || value.state } : null;
  const stateOptions = uniqueOptions(
    countryLocations.map((item) => ({ name: item.state || item.state_code, code: item.state_code || item.state }))
  );
  const cityOptions = countryLocations
    .filter((item) => !value.state || item.state === value.state)
    .sort((a, b) => cityName(a).localeCompare(cityName(b)));
  const zones = selectedLocation?.location_zones ?? [];
  const selectedZone = zones.find((zone: any) => zone.zone_name === value.locality) ?? null;

  const set = (patch: Partial<VenueLocationValues>) => onChange({ ...value, ...patch });
  const showError = (key: keyof VenueLocationValues) => Boolean(errors?.[key] && (showAllErrors || value[key]));
  const chooseLocation = (location: any | null) => {
    if (!location) {
      set({ location_id: '', city: '', locality: '', postal_code: '' });
      return;
    }
    set({
      location_id: location.id,
      country: location.country || 'India',
      country_code: location.country_code || 'IN',
      state: location.state || '',
      state_code: location.state_code || '',
      city: cityName(location),
      locality: location.location_zones?.length ? '' : cityName(location),
      postal_code: location.location_zones?.length ? '' : location.location_pincode || '',
    });
  };

  return (
    <Box sx={{ display: 'grid', columnGap: 1.5, rowGap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <Autocomplete
        options={countryOptions}
        value={selectedCountry}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        onChange={(_, next) => set({ country: next?.name ?? '', country_code: next?.code ?? '', state: '', state_code: '', location_id: '', city: '', locality: '', postal_code: '' })}
        renderInput={(params) => <TextField {...params} label="Country" required error={showError('country')} helperText={showError('country') ? errors?.country : ' '} />}
      />
      <Autocomplete
        options={stateOptions}
        value={selectedState}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        disabled={!value.country_code}
        onChange={(_, next) => set({ state: next?.name ?? '', state_code: next?.code ?? '', location_id: '', city: '', locality: '', postal_code: '' })}
        renderInput={(params) => <TextField {...params} label="State" required error={showError('state')} helperText={showError('state') ? errors?.state : ' '} />}
      />
      <Autocomplete
        options={cityOptions}
        value={selectedLocation}
        getOptionLabel={cityName}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={!value.state}
        onChange={(_, next) => chooseLocation(next)}
        renderInput={(params) => <TextField {...params} label="City" required error={showError('city')} helperText={showError('city') ? errors?.city : ' '} />}
      />
      <Autocomplete
        options={zones}
        value={selectedZone}
        getOptionLabel={(option) => option.zone_name}
        isOptionEqualToValue={(a, b) => a.zone_name === b.zone_name}
        disabled={!selectedLocation || zones.length === 0}
        onChange={(_, next) => set({ locality: next?.zone_name ?? '', postal_code: next?.pincode || selectedLocation?.location_pincode || '' })}
        renderInput={(params) => <TextField {...params} label="Locality / Area" required={zones.length > 0} error={showError('locality')} helperText={showError('locality') ? errors?.locality : ' '} />}
      />
      <TextField label="PIN code" required value={value.postal_code} InputProps={{ readOnly: true }} error={showError('postal_code')} helperText={showError('postal_code') ? errors?.postal_code : ' '} />
    </Box>
  );
}
