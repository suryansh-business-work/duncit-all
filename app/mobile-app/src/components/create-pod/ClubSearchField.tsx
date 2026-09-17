import { useState } from 'react';
import { Input, YStack } from 'tamagui';
import { clubPlaceLabel } from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from './ChipSelectField';
import type { CreatePodClub, CreatePodLocation } from './create-pod.types';

interface Props {
  clubs: CreatePodClub[];
  /** The cities, so each club can show where it operates. */
  locations: CreatePodLocation[];
  value: string;
  onChange: (clubId: string) => void;
  error?: string;
  required?: boolean;
}

/** Searchable club picker — a filter box over a chip list (host's own clubs),
 * each chip reading "Name | (pin) Locality, City". The search matches either. */
export function ClubSearchField({
  clubs,
  locations,
  value,
  onChange,
  error,
  required,
}: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const { t } = useTranslation();
  const term = query.trim().toLowerCase();
  const options = clubs.map((club) => ({
    value: club.id,
    label: club.club_name,
    place: clubPlaceLabel(club, locations),
  }));
  const filtered = term
    ? options.filter((option) =>
        [option.label, option.place].join(' ').toLowerCase().includes(term),
      )
    : options;

  return (
    <YStack gap={6}>
      <FieldLabel
        label={t('mweb.createPod.clubLabel')}
        required={required}
        testID="create-pod-club-field"
      />
      <Input
        testID="create-pod-club-search"
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor="$borderColor"
        value={query}
        onChangeText={setQuery}
        placeholder={t('mweb.createPod.clubSearchPlaceholder')}
        aria-label={t('mweb.createPod.clubSearchAria')}
      />
      <ChipSelectField
        label=""
        options={filtered}
        value={value}
        onChange={onChange}
        error={error}
        emptyHint={t('mweb.createPod.clubsEmpty')}
        testID="create-pod-club"
      />
    </YStack>
  );
}
