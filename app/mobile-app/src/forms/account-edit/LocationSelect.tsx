import { useController, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Input, Text, XStack, YStack } from 'tamagui';
import { COUNTRY_OPTIONS, findCountryByName, getStatesForCountry } from '@duncit/geo';

import { SelectSheet, type SelectOption } from './SelectSheet';
import type { AccountEditValues } from './account-edit.types';

type LocationField = 'country' | 'state' | 'city';

/** Keep a saved value selectable even if it is missing from the dataset. */
function withCurrent(options: SelectOption[], current: string): SelectOption[] {
  if (!current || options.some((o) => o.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

/** Free-text city — the city is a custom value, not a fixed picklist. */
function CityField({ control }: Readonly<{ control: Control<AccountEditValues> }>) {
  const { field } = useController({ control, name: 'city' });
  return (
    <YStack gap={6} flex={1}>
      <Text fontSize={14} fontWeight="500" color="$color">
        City
      </Text>
      <Input
        testID="location-city"
        aria-label="City"
        value={String(field.value ?? '')}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        placeholder="Enter city"
        placeholderTextColor="$muted"
        height={48}
        paddingHorizontal={12}
        borderRadius={9}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        fontSize={14}
        color="$color"
      />
    </YStack>
  );
}

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

/**
 * Country → State (dataset-driven — the State list depends on the Country) plus
 * a free-text City. Country/State come from the shared @duncit/geo dataset (not
 * admin locations); City is a custom value. RN twin of mWeb's LocationSelect.
 */
export function LocationSelect({ control, setValue }: Readonly<Props>) {
  const country = useWatch({ control, name: 'country' }) ?? '';
  const state = useWatch({ control, name: 'state' }) ?? '';

  const countryOptions = withCurrent(
    COUNTRY_OPTIONS.map((c) => ({ value: c.name, label: c.name })),
    country,
  );
  const stateOptions = withCurrent(
    getStatesForCountry(findCountryByName(country)?.isoCode).map((s) => ({
      value: s.name,
      label: s.name,
    })),
    state,
  );

  const reset = (name: LocationField, value: string) =>
    setValue(name, value, { shouldDirty: true, shouldValidate: true });

  return (
    <YStack gap={14}>
      <SelectSheet
        testID="location-country"
        label="Country"
        value={country}
        placeholder="Select country"
        options={countryOptions}
        onPick={(value) => {
          reset('country', value);
          reset('state', '');
          reset('city', '');
        }}
      />
      <XStack gap={12}>
        <SelectSheet
          testID="location-state"
          label="State"
          value={state}
          placeholder="Select state"
          options={stateOptions}
          disabled={!country}
          onPick={(value) => reset('state', value)}
        />
        <CityField control={control} />
      </XStack>
    </YStack>
  );
}
