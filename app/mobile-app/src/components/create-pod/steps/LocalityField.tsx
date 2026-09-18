import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FieldLabel } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodClub, CreatePodForm, CreatePodLocationZone } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** The areas of the pod's city — the city is the header's selected location. */
  zones: CreatePodLocationZone[];
  /** The clubs this host may pick in that city, before an area narrows them. */
  cityClubs: CreatePodClub[];
  cityName: string;
}

interface RowProps {
  name: string;
  countLabel: string;
  selected: boolean;
  onPick: (name: string) => void;
}

/** One locality in the open dropdown: its name and how many clubs it holds. */
function LocalityRow({ name, countLabel, selected, onPick }: Readonly<RowProps>) {
  const { muted, accent } = useThemeColors();
  return (
    <XStack
      testID={`create-pod-locality-option-${name}`}
      role="radio"
      aria-checked={selected}
      aria-label={`${name}, ${countLabel}`}
      tabIndex={0}
      onPress={() => onPick(name)}
      minHeight={44}
      alignItems="center"
      gap={8}
      paddingHorizontal={8}
      borderRadius={8}
      backgroundColor={selected ? '$soft' : 'transparent'}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name="place" size={16} color={selected ? accent : muted} />
      <Text
        flex={1}
        fontSize={14}
        fontWeight={selected ? '600' : '400'}
        color="$color"
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text fontSize={12} color="$muted">
        {countLabel}
      </Text>
    </XStack>
  );
}

/**
 * Step 1 — a searchable dropdown of the city's localities, each with the number
 * of this host's clubs in it. Picking one is what opens the club picker below,
 * and a new pick clears the club chosen for the old area. mWeb twin (rule 27).
 */
export function LocalityField({ form, zones, cityClubs, cityName }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const locality = form.watch('locality');
  const term = query.trim().toLowerCase();
  const shown = term ? zones.filter((zone) => zone.zone_name.toLowerCase().includes(term)) : zones;
  const countLabel = (zone: CreatePodLocationZone) =>
    t('mweb.clubsPage.clubCount', {
      count: cityClubs.filter((club) => (club.locality ?? '') === zone.zone_name).length,
    });
  const pick = (name: string) => {
    applyPodLocation(form, form.getValues('location_id'), name);
    setOpen(false);
    setQuery('');
  };
  const label = t('mweb.createPod.localityHeading');

  return (
    <YStack gap={6} testID="create-pod-locality">
      <FieldLabel label={label} required testID="create-pod-locality-label" />
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.localityCityHint', { vars: { city: cityName } })}
      </Text>
      <XStack
        testID="create-pod-locality-trigger"
        role="button"
        aria-label={label}
        aria-expanded={open}
        tabIndex={0}
        onPress={() => setOpen(!open)}
        minHeight={44}
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$4"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="place" size={18} color={muted} />
        <Text flex={1} fontSize={14} color={locality ? '$color' : '$muted'} numberOfLines={1}>
          {locality || t('mweb.createPod.localityPlaceholder')}
        </Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={muted} />
      </XStack>
      {open ? (
        <YStack gap={6} padding={8} borderWidth={1} borderColor="$borderColor" borderRadius="$4">
          <Input
            testID="create-pod-locality-search"
            size="$4"
            backgroundColor="$surface"
            color="$color"
            placeholderTextColor="$muted"
            borderColor="$borderColor"
            value={query}
            onChangeText={setQuery}
            placeholder={t('mweb.createPod.localityPlaceholder')}
            aria-label={t('mweb.createPod.localityPlaceholder')}
          />
          <ScrollView maxHeight={240} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <YStack role="radiogroup" aria-label={label}>
              {shown.map((zone) => (
                <LocalityRow
                  key={zone.zone_name}
                  name={zone.zone_name}
                  countLabel={countLabel(zone)}
                  selected={zone.zone_name === locality}
                  onPick={pick}
                />
              ))}
            </YStack>
          </ScrollView>
          {shown.length === 0 ? (
            <Text testID="create-pod-locality-empty" role="status" fontSize={13} color="$muted">
              {t('mweb.createPod.localitiesEmpty')}
            </Text>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  );
}
