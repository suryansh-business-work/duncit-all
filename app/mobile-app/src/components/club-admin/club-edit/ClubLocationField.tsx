import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { clubCityName } from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { LocationDialog } from '@/components/LocationDialog';
import { ChipSelectField } from '@/components/create-pod';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { LocationItem } from '@/stores/location.store';

interface Props {
  /** The club's city — a Location document id. */
  locationId: string;
  /** The area of that city the club operates in, or '' for the whole city. */
  locality: string;
  onChange: (locationId: string, locality: string) => void;
  /** Why the city is invalid, or undefined. The area is optional, as on mWeb. */
  error?: string;
}

/**
 * Country › State › City › Locality for the club editor — the Tamagui twin of
 * the `AdminLocationSelect` cascade @duncit/club-form renders on mWeb and in
 * the Partners console (rule 27).
 *
 * The first three levels are the app's existing `LocationDialog` drilldown —
 * the same sheet the header and Auto Pods open — captured into the form instead
 * of the global selection. The area stays a field of its own so it can be
 * changed without re-walking the drilldown, and so applying the sheet without
 * touching its area list never silently clears the club's saved one.
 */
export function ClubLocationField({ locationId, locality, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const { locations } = useLocations();
  const { muted, primary } = useThemeColors();
  const [open, setOpen] = useState(false);

  const city = locations.find((item) => item.id === locationId);
  // Country and state come with the Location document, so the saved city alone
  // rebuilds the whole cascade — exactly what `buildLocationValue` does on MUI.
  const cityLabel = city
    ? [clubCityName(city), city.state, city.country].filter(Boolean).join(', ')
    : '';
  const zones = city?.location_zones ?? [];
  // "Any area" is how a club goes back to covering its whole city — the native
  // stand-in for the MUI locality dropdown's clear button.
  const areas = zones.length
    ? [
        { value: '', label: t('clubForm.basicSection.anyLocality') },
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
    <YStack gap={12} testID="club-edit-location">
      <FieldLabel
        label={t('clubForm.basicSection.location')}
        required
        testID="club-edit-location"
      />
      <Text testID="club-edit-location-hint" fontSize={12} color="$muted">
        {t('clubForm.basicSection.locationHint')}
      </Text>
      <XStack
        testID="club-edit-city"
        role="button"
        tabIndex={0}
        aria-label={t('clubForm.basicSection.cityAria', {
          vars: { city: cityLabel || t('clubForm.basicSection.cityPlaceholder') },
        })}
        onPress={() => setOpen(true)}
        minHeight={48}
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$4"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="place" size={18} color={primary} />
        <Text flex={1} fontSize={14} color={cityLabel ? '$color' : '$muted'} numberOfLines={1}>
          {cityLabel || t('clubForm.basicSection.cityPlaceholder')}
        </Text>
        <Text fontSize={13} fontWeight="600" color="$accent">
          {t('clubForm.basicSection.changeCity')}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={muted} />
      </XStack>
      {error ? (
        <Text role="alert" testID="club-edit-city-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {city ? (
        <ChipSelectField
          label={t('clubForm.basicSection.locality')}
          options={areas}
          value={locality}
          onChange={(next) => onChange(locationId, next)}
          emptyHint={t('clubForm.basicSection.noLocalities')}
          testID="club-edit-locality"
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
