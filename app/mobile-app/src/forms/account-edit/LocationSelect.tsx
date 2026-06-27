import { useController, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { countryFlagUrl, type CountryNode } from '@/utils/location-tree';
import { SelectSheet, type SelectOption } from './SelectSheet';
import type { AccountEditValues } from './account-edit.types';

type LocationField = 'country' | 'state' | 'city';

interface DropdownProps {
  control: Control<AccountEditValues>;
  name: LocationField;
  label: string;
  options: SelectOption[];
  disabled?: boolean;
  onPick: (value: string) => void;
}

/** A single dependent dropdown — hoisted to module scope (S6478). */
function LocationDropdown({
  control,
  name,
  label,
  options,
  disabled,
  onPick,
}: Readonly<DropdownProps>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <SelectSheet
      testID={`location-${name}`}
      label={label}
      value={String(field.value ?? '')}
      placeholder="Not set"
      options={options}
      disabled={disabled}
      error={fieldState.error?.message}
      onPick={onPick}
    />
  );
}

/** Keep the saved value selectable even if it is missing from the location tree. */
function withCurrent(
  names: string[],
  current: string,
  flags?: Record<string, string>,
): SelectOption[] {
  const all = current && !names.includes(current) ? [current, ...names] : names;
  return all.map((name) => ({ value: name, label: name, flag: flags?.[name] }));
}

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
  countries: CountryNode[];
}

/**
 * Dependent Country → State → City dropdowns (bug 2). Picking a country resets
 * the state and city; picking a state resets the city — so only valid
 * combinations are saved. RN twin of mWeb's LocationSelect.
 */
export function LocationSelect({ control, setValue, countries }: Readonly<Props>) {
  const country = useWatch({ control, name: 'country' }) ?? '';
  const state = useWatch({ control, name: 'state' }) ?? '';
  const city = useWatch({ control, name: 'city' }) ?? '';

  const activeCountry = countries.find((c) => c.country === country);
  const activeState = activeCountry?.states.find((s) => s.state === state);
  const countryNames = countries.map((c) => c.country);
  const countryFlags = Object.fromEntries(
    countries.map((c) => [c.country, countryFlagUrl(c.country_code)]),
  );
  const stateNames = (activeCountry?.states ?? []).map((s) => s.state);
  const cityNames = Array.from(
    new Set((activeState?.cities ?? []).map((loc) => loc.city || loc.location_name)),
  );

  const reset = (fieldName: LocationField, value: string) =>
    setValue(fieldName, value, { shouldDirty: true, shouldValidate: true });

  return (
    <YStack gap={14}>
      <LocationDropdown
        control={control}
        name="country"
        label="Country"
        options={withCurrent(countryNames, country, countryFlags)}
        onPick={(value) => {
          reset('country', value);
          reset('state', '');
          reset('city', '');
        }}
      />
      <XStack gap={12}>
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
      </XStack>
    </YStack>
  );
}
