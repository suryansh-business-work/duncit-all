import { useMemo } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { useAdminLocations } from './queries';
import {
  cityOptions,
  cityPincode,
  countryOptions,
  localityOptions,
  stateOptions,
  type Option,
} from './locationOptions';
import { EMPTY_LOCATION, type AdminLocationValue, type LocationLevel } from './types';

const ALL_LEVELS: LocationLevel[] = ['country', 'state', 'city', 'locality'];
const DEFAULT_LABELS: Record<LocationLevel, string> = {
  country: 'Country',
  state: 'State',
  city: 'City',
  locality: 'Locality',
};

interface LevelSelectProps {
  label: string;
  options: Option[];
  value: string;
  disabled: boolean;
  required: boolean;
  loading: boolean;
  size: 'small' | 'medium';
  error?: string;
  onPick: (option: Option | null) => void;
}

/** One strict (no free-text) cascading dropdown. Hoisted to module scope. */
function LevelSelect({
  label,
  options,
  value,
  disabled,
  required,
  loading,
  size,
  error,
  onPick,
}: Readonly<LevelSelectProps>) {
  const selected = options.find((option) => option.value === value) ?? null;
  return (
    <Autocomplete<Option>
      options={options}
      value={selected}
      disabled={disabled}
      loading={loading}
      size={size}
      fullWidth
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(_, option) => onPick(option)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={!!error}
          helperText={error ?? ' '}
        />
      )}
    />
  );
}

export interface AdminLocationSelectProps {
  value: AdminLocationValue;
  onChange: (value: AdminLocationValue) => void;
  /** Which cascading levels to render (default: all four). */
  fields?: LocationLevel[];
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  direction?: 'row' | 'column';
  labels?: Partial<Record<LocationLevel, string>>;
  errors?: Partial<Record<LocationLevel, string>>;
}

/**
 * The one common location picker — cascading Country → State → City → Locality,
 * sourced strictly from the admin-managed Location DB (no free-text). Emits the
 * full structured value so every form stays in sync with admin.
 */
export function AdminLocationSelect({
  value,
  onChange,
  fields = ALL_LEVELS,
  required = false,
  disabled = false,
  size = 'small',
  direction = 'column',
  labels,
  errors,
}: Readonly<AdminLocationSelectProps>) {
  const { locations, loading } = useAdminLocations();

  const options = useMemo(
    () => ({
      country: countryOptions(locations),
      state: stateOptions(locations, value.country_code),
      city: cityOptions(locations, value.country_code, value.state),
      locality: localityOptions(locations, value.location_id),
    }),
    [locations, value.country_code, value.state, value.location_id],
  );

  const pick: Record<LocationLevel, (option: Option | null) => void> = {
    country: (option) =>
      onChange({ ...EMPTY_LOCATION, country: option?.label ?? '', country_code: option?.value ?? '' }),
    state: (option) =>
      onChange({ ...value, state: option?.value ?? '', city: '', location_id: '', locality: '', pincode: '' }),
    city: (option) => {
      const location_id = (option as { location_id?: string } | null)?.location_id ?? '';
      onChange({
        ...value,
        city: option?.value ?? '',
        location_id,
        locality: '',
        pincode: location_id ? cityPincode(locations, location_id) : '',
      });
    },
    locality: (option) => {
      const pincode = (option as { pincode?: string } | null)?.pincode;
      onChange({
        ...value,
        locality: option?.value ?? '',
        pincode: pincode || cityPincode(locations, value.location_id),
      });
    },
  };

  const selectedValue: Record<LocationLevel, string> = {
    country: value.country_code,
    state: value.state,
    city: value.city,
    locality: value.locality,
  };
  const parentReady: Record<LocationLevel, boolean> = {
    country: true,
    state: !!value.country_code,
    city: !!value.state,
    locality: !!value.location_id,
  };

  const active = ALL_LEVELS.filter((level) => fields.includes(level));

  return (
    <Stack direction={direction} spacing={2} sx={{ width: '100%' }}>
      {active.map((level) => (
        <LevelSelect
          key={level}
          label={labels?.[level] ?? DEFAULT_LABELS[level]}
          options={options[level]}
          value={selectedValue[level]}
          disabled={disabled || !parentReady[level]}
          required={required}
          loading={loading}
          size={size}
          error={errors?.[level]}
          onPick={pick[level]}
        />
      ))}
    </Stack>
  );
}
