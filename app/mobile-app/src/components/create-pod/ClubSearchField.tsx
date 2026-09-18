import { useState } from 'react';
import { Input, Text, YStack } from 'tamagui';
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
  /** The picked locality, or '' — names the club count under the label. */
  locality: string;
  /** Until a locality is picked there is nothing to choose from. */
  locked: boolean;
}

/** Searchable club picker — a filter box over a chip list (host's own clubs),
 * each chip reading "Name | (pin) Locality, City". The search matches either.
 * It opens once a locality is picked. mWeb twin: steps/ClubField. */
export function ClubSearchField({
  clubs,
  locations,
  value,
  onChange,
  error,
  required,
  locality,
  locked,
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
  const countHint = locality
    ? t('mweb.createPod.clubsInLocality', { count: clubs.length, vars: { locality } })
    : '';
  const hint = locked ? t('mweb.createPod.clubPickLocalityFirst') : countHint;

  return (
    <YStack gap={6}>
      <FieldLabel
        label={t('mweb.createPod.clubLabel')}
        required={required}
        testID="create-pod-club-field"
      />
      {hint ? (
        <Text testID="create-pod-club-hint" fontSize={12} color="$muted">
          {hint}
        </Text>
      ) : null}
      {locked ? null : (
        <>
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
            emptyHint={t('mweb.createPod.clubsEmpty')}
            testID="create-pod-club"
          />
        </>
      )}
      {error ? (
        <Text role="alert" testID="create-pod-club-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
