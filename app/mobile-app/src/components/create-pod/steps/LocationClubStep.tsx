import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { MapEmbed } from '@/components/MapEmbed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChipSelectField } from '../ChipSelectField';
import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
  CreatePodLocation,
} from '../create-pod.types';

const MODES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  hostCategories: CreatePodHostCategory[];
}

const locationLabel = (location: CreatePodLocation) =>
  location.city && location.city !== location.location_name
    ? `${location.location_name} (${location.city})`
    : location.location_name;

const categoryPath = (category: CreatePodHostCategory) =>
  [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');

/** Step 2 — pod location (defaults to the host's selected location, changeable
 * inline), the auto-selected host category (read-only) and the club. */
export function LocationClubStep({ form, clubs, locations, hostCategories }: Readonly<Props>) {
  const { control, setValue, watch } = form;
  const { primary } = useThemeColors();
  const locationId = watch('location_id');
  const location = locations.find((item) => item.id === locationId);
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const filtered = term
    ? locations.filter((item) => locationLabel(item).toLowerCase().includes(term))
    : locations;

  const pickLocation = (nextId: string) => {
    if (nextId && nextId !== locationId) {
      setValue('location_id', nextId, { shouldDirty: true, shouldValidate: true });
      // Venue + slot belong to the old city — reselect them for the new one.
      setValue('venue_id', '', { shouldDirty: true });
      setValue('venue_slot_id', '', { shouldDirty: true });
    }
    setChanging(false);
  };

  return (
    <YStack gap={14}>
      <YStack gap={6} padding={12} borderWidth={1} borderColor="$borderColor" borderRadius={12}>
        <XStack alignItems="center" gap={8}>
          <MaterialIcons name="place" size={18} color={primary} />
          <YStack flex={1}>
            <Text fontSize={12} fontWeight="800" color="$muted">
              Pod location
            </Text>
            <Text testID="create-pod-location-label" fontSize={15} fontWeight="900" color="$color">
              {location
                ? [locationLabel(location), location.state].filter(Boolean).join(', ')
                : 'No location selected'}
            </Text>
          </YStack>
          <XStack
            testID="create-pod-change-location"
            role="button"
            aria-label="Change location"
            onPress={() => setChanging((prev) => !prev)}
            paddingHorizontal={12}
            paddingVertical={8}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={10}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={13} fontWeight="800" color="$color">
              {changing ? 'Close' : 'Change'}
            </Text>
          </XStack>
        </XStack>
        <Text fontSize={12} color="$muted">
          Defaults to your selected location — the pod is listed in this city.
        </Text>
        {changing ? (
          <YStack gap={10} paddingTop={6}>
            <Input
              testID="create-pod-location-search"
              size="$4"
              backgroundColor="$surface"
              color="$color"
              placeholderTextColor="$muted"
              borderColor="$borderColor"
              value={query}
              onChangeText={setQuery}
              placeholder="Search cities"
              aria-label="Search cities"
            />
            <Controller
              control={control}
              name="location_id"
              render={({ field, fieldState }) => (
                <ChipSelectField
                  label="Pick a city"
                  options={filtered.map((item) => ({ value: item.id, label: locationLabel(item) }))}
                  value={field.value}
                  onChange={pickLocation}
                  error={fieldState.error?.message}
                  emptyHint="No cities match your search."
                  testID="create-pod-location"
                />
              )}
            />
          </YStack>
        ) : null}
      </YStack>

      {location ? (
        <MapEmbed
          query={[locationLabel(location), location.state].filter(Boolean).join(', ')}
          height={170}
        />
      ) : null}

      <YStack gap={4}>
        <Text fontSize={14} fontWeight="500" color="$color">
          Category
        </Text>
        <YStack
          padding={12}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={12}
          opacity={0.7}
        >
          <Text testID="create-pod-category" fontSize={14} fontWeight="700" color="$color">
            {hostCategories.length
              ? hostCategories.map(categoryPath).join(' · ')
              : 'Assigned after host onboarding'}
          </Text>
        </YStack>
        <Text fontSize={12} color="$muted">
          Auto-selected from your onboarded host category
        </Text>
      </YStack>

      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ChipSelectField
            label="Mode"
            options={MODES}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-mode"
          />
        )}
      />
      <Controller
        control={control}
        name="club_id"
        render={({ field, fieldState }) => (
          <ClubSearchField
            clubs={clubs}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />
    </YStack>
  );
}
