import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import type { CountryNode } from '../../../utils/location-tree';
import type { AccountEditValues } from './account-edit.types';

type LocationField = 'country' | 'state' | 'city';

interface DropdownProps {
  control: Control<AccountEditValues>;
  name: LocationField;
  label: string;
  options: string[];
  disabled?: boolean;
  onPick: (value: string) => void;
}

/** A single dependent dropdown — hoisted to module scope (S6478). */
function LocationDropdown({ control, name, label, options, disabled, onPick }: Readonly<DropdownProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          label={label}
          size="small"
          value={field.value ?? ''}
          name={field.name}
          inputRef={field.ref}
          disabled={disabled}
          onBlur={field.onBlur}
          onChange={(event) => onPick(event.target.value)}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? ' '}
        >
          <MenuItem value="">
            <em>Not set</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

/** Keep the saved value selectable even if it is missing from the location tree. */
const withCurrent = (options: string[], current?: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
  countries: CountryNode[];
}

/**
 * Dependent Country → State → City dropdowns (bug 2). Picking a country resets
 * the state and city; picking a state resets the city — so only valid
 * combinations are saved. Replaces the old free-text location inputs.
 */
export default function LocationSelect({ control, setValue, countries }: Readonly<Props>) {
  const country = useWatch({ control, name: 'country' });
  const state = useWatch({ control, name: 'state' });
  const city = useWatch({ control, name: 'city' });

  const activeCountry = countries.find((c) => c.country === country);
  const activeState = activeCountry?.states.find((s) => s.state === state);
  const countryNames = countries.map((c) => c.country);
  const stateNames = (activeCountry?.states ?? []).map((s) => s.state);
  const cityNames = Array.from(
    new Set((activeState?.cities ?? []).map((loc) => loc.city || loc.location_name)),
  );

  const reset = (field: LocationField, value: string) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: true });

  return (
    <Stack spacing={1.5}>
      <LocationDropdown
        control={control}
        name="country"
        label="Country"
        options={withCurrent(countryNames, country)}
        onPick={(value) => {
          reset('country', value);
          reset('state', '');
          reset('city', '');
        }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LocationDropdown
          control={control}
          name="state"
          label="State"
          options={withCurrent(stateNames, state)}
          disabled={!country}
          onPick={(value) => {
            reset('state', value);
            reset('city', '');
          }}
        />
        <LocationDropdown
          control={control}
          name="city"
          label="City"
          options={withCurrent(cityNames, city)}
          disabled={!state}
          onPick={(value) => reset('city', value)}
        />
      </Stack>
    </Stack>
  );
}
