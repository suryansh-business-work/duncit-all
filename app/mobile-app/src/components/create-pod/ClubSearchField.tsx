import { useState } from 'react';
import { Input, Text, YStack } from 'tamagui';
import { clubLacksOpenSlots, clubPlaceLabel, clubSlotsLabel } from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from './ChipSelectField';
import type { CreatePodClub, CreatePodLocation } from './create-pod.types';
import { NoSlotsSheet } from './NoSlotsSheet';

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
  /** PHYSICAL shows each club's open slots and refuses a club with none. */
  podMode: string;
}

/** Searchable club picker — a filter box over a chip list (host's own clubs),
 * each chip reading "Name | (pin) Locality, City". The search matches either.
 * It opens once a locality is picked. For a physical pod each chip names its
 * open slots, and a club with none opens the no-slots dialog instead of being
 * selected. mWeb twin: steps/ClubField. */
export function ClubSearchField({
  clubs,
  locations,
  value,
  onChange,
  error,
  required,
  locality,
  locked,
  podMode,
}: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const [blockedClub, setBlockedClub] = useState<CreatePodClub | null>(null);
  const { t } = useTranslation();
  const term = query.trim().toLowerCase();
  const physical = podMode === 'PHYSICAL';
  const options = clubs.map((club) => {
    const slots = clubSlotsLabel(club, t);
    return {
      value: club.id,
      label: club.club_name,
      place: clubPlaceLabel(club, locations),
      note: physical ? slots.label : undefined,
      noteWarn: !slots.open,
    };
  });
  const pick = (clubId: string) => {
    const club = clubs.find((item) => item.id === clubId) ?? null;
    if (clubLacksOpenSlots(club, podMode)) {
      setBlockedClub(club);
      return;
    }
    onChange(clubId);
  };
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
            onChange={pick}
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
      <NoSlotsSheet club={blockedClub} onClose={() => setBlockedClub(null)} />
    </YStack>
  );
}
