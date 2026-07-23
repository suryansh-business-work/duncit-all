import { useState } from 'react';
import { Input, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { ChipSelectField } from './ChipSelectField';
import type { CreatePodClub } from './create-pod.types';

interface Props {
  clubs: CreatePodClub[];
  value: string;
  onChange: (clubId: string) => void;
  error?: string;
  required?: boolean;
}

/** Searchable club picker — a filter box over a chip list (host's own clubs). */
export function ClubSearchField({ clubs, value, onChange, error, required }: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const filtered = term
    ? clubs.filter((club) => club.club_name.toLowerCase().includes(term))
    : clubs;

  return (
    <YStack gap={6}>
      <FieldLabel label="Club" required={required} testID="create-pod-club-field" />
      <Input
        testID="create-pod-club-search"
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor="$borderColor"
        value={query}
        onChangeText={setQuery}
        placeholder="Search your clubs"
        aria-label="Search clubs"
      />
      <ChipSelectField
        label=""
        options={filtered.map((club) => ({ value: club.id, label: club.club_name }))}
        value={value}
        onChange={onChange}
        error={error}
        emptyHint="No clubs match your search."
        testID="create-pod-club"
      />
    </YStack>
  );
}
