import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Input, Text, YStack } from 'tamagui';

import { ChipSelectField } from '../ChipSelectField';
import type { CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  locations: CreatePodLocation[];
}

const optionLabel = (location: CreatePodLocation) =>
  location.city && location.city !== location.location_name
    ? `${location.location_name} (${location.city})`
    : location.location_name;

/** Step 1 — where the host wants to run the pod. The picked city drives which
 * clubs load on the next step. Mirrors mWeb's LocationStep. */
export function LocationStep({ form, locations }: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const filtered = term
    ? locations.filter((location) => optionLabel(location).toLowerCase().includes(term))
    : locations;

  return (
    <YStack gap={14}>
      <Text fontSize={13} color="$muted" fontWeight="700">
        Pick the city you want to host in — clubs on the next step load for this location.
      </Text>
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
        control={form.control}
        name="location_id"
        render={({ field, fieldState }) => (
          <ChipSelectField
            label="Where do you want to host?"
            options={filtered.map((location) => ({
              value: location.id,
              label: optionLabel(location),
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            emptyHint="No cities match your search."
            testID="create-pod-location"
          />
        )}
      />
    </YStack>
  );
}
