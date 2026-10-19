import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { clubCityName } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { FieldLabel } from '@/components/Field';
import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LocationItem } from '@/stores/location.store';

/** The field's words, already translated by the caller — each form owns its copy. */
export interface LocationPickerCopy {
  label: string;
  hint?: string;
  placeholder: string;
  change: string;
  cityAria: (city: string) => string;
  /** The area chips' label; the chips are only drawn when it is given. */
  locality?: string;
  anyLocality?: string;
  noLocalities?: string;
  /** "All cities": when given, a picked city can be cleared again (a filter). */
  clear?: string;
}

interface Props {
  /** The picked city — a Location document id, '' for none. */
  locationId: string;
  /** The area of that city, or '' for the whole city. */
  locality: string;
  onChange: (locationId: string, locality: string) => void;
  copy: LocationPickerCopy;
  /** Prefix of every testID the field draws (`<prefix>-city`, `<prefix>-locality` …). */
  testID: string;
  required?: boolean;
  error?: string;
}

/**
 * Country › State › City › Area from the admin Location list, captured into a
 * form instead of the header's global selection — the Tamagui twin of
 * `@duncit/location`'s `AdminLocationSelect` (club editor, gig post, freelancer
 * profile, gig board filter).
 *
 * The first three levels are the app's `LocationDialog` drilldown. The area
 * stays a field of its own so it can be changed without re-walking the
 * drilldown, and so applying the sheet without touching its area list never
 * silently clears the saved one.
 */
export function LocationPickerField({
  locationId,
  locality,
  onChange,
  copy,
  testID,
  required = false,
  error,
}: Readonly<Props>) {
  const { locations } = useLocations();
  const { muted, primary } = useThemeColors();
  const [open, setOpen] = useState(false);

  const city = locations.find((item) => item.id === locationId);
  // Country and state come with the Location document, so the saved city alone
  // rebuilds the whole cascade — exactly what `buildLocationValue` does on MUI.
  const cityLabel = city
    ? [clubCityName(city), city.state, city.country].filter(Boolean).join(', ')
    : '';
  const shown = cityLabel || copy.placeholder;
  const zones = city?.location_zones ?? [];
  // "Any area" is how a value goes back to the whole city — the native
  // stand-in for the MUI locality dropdown's clear button.
  const areas = zones.length
    ? [
        { value: '', label: copy.anyLocality ?? '' },
        ...zones.map((zone) => ({ value: zone.zone_name, label: zone.zone_name })),
      ]
    : [];

  const applyCity = (picked: LocationItem, zone: string) => {
    // A different city invalidates the area saved for the old one. The same
    // city keeps it, because the sheet always opens with its area list blank.
    const keepArea = picked.id === locationId && !zone;
    onChange(picked.id, keepArea ? locality : zone);
  };

  return (
    <YStack gap={12} testID={`${testID}-location`}>
      <FieldLabel label={copy.label} required={required} testID={`${testID}-location`} />
      {copy.hint ? (
        <Text testID={`${testID}-location-hint`} fontSize={12} color="$muted">
          {copy.hint}
        </Text>
      ) : null}
      <XStack
        testID={`${testID}-city`}
        role="button"
        tabIndex={0}
        aria-label={copy.cityAria(shown)}
        onPress={() => setOpen(true)}
        minHeight={48}
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        borderRadius="$4"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="place" size={18} color={primary} />
        <Text flex={1} fontSize={14} color={cityLabel ? '$color' : '$muted'} numberOfLines={1}>
          {shown}
        </Text>
        <Text fontSize={13} fontWeight="600" color="$accent">
          {copy.change}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={muted} />
      </XStack>
      {copy.clear && locationId ? (
        <Text
          testID={`${testID}-clear`}
          role="button"
          tabIndex={0}
          onPress={() => onChange('', '')}
          alignSelf="flex-start"
          fontSize={13}
          fontWeight="600"
          color="$accent"
          paddingVertical={4}
        >
          {copy.clear}
        </Text>
      ) : null}
      {error ? (
        <Text role="alert" testID={`${testID}-city-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {city && copy.locality ? (
        <ChipSelectField
          label={copy.locality}
          options={areas}
          value={locality}
          onChange={(next) => onChange(locationId, next)}
          emptyHint={copy.noLocalities}
          testID={`${testID}-locality`}
        />
      ) : null}
      <LocationDialog
        open={open}
        onClose={() => setOpen(false)}
        onApply={applyCity}
        initialLocationId={locationId}
      />
    </YStack>
  );
}
