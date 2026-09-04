import { useEffect } from 'react';
import { Text, YStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import {
  useAutoPodVenues,
  venueCategoryPath,
  type AutoPodVenueOption,
} from '@/hooks/useAutoPodVenues';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** The venue looking at the queue; null until the list has answered. */
  value: AutoPodVenueOption | null;
  onChange: (venue: AutoPodVenueOption | null) => void;
  labels: AutoPodLabels;
}

/**
 * The venue queue's own picker: which of the owner's approved venues is
 * looking. The offers shown are the ones THAT venue could take — its category
 * and its city — so the category is written under the chips to say why the
 * list is what it is. The first venue is chosen on arrival; a venue with no
 * category is offered nothing, and says so.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodVenuePicker` (rule 27).
 */
export function AutoPodVenueRow({ value, onChange, labels }: Readonly<Props>) {
  const { warning } = useThemeColors();
  const { venues, loaded } = useAutoPodVenues();

  useEffect(() => {
    const first = venues[0];
    if (!value && first) onChange(first);
  }, [value, venues, onChange]);

  // A picker that is simply empty mid-read is indistinguishable from a venue
  // owner with no venues, which is exactly the wrong thing to tell them.
  if (!loaded) {
    return <LoadingIndicator testID="auto-pod-venues-loading" />;
  }

  if (venues.length === 0) {
    return (
      <Text testID="auto-pods-no-venues" fontSize={12.5} color="$muted">
        {labels.noVenues}
      </Text>
    );
  }

  const path = venueCategoryPath(value);
  const options = venues.map((venue) => [venue.id, venue.venue_name] as readonly [string, string]);

  return (
    <YStack testID="auto-pods-venue-row" gap={6}>
      <Text fontSize={11.5} fontWeight="600" color="$muted" textTransform="uppercase">
        {labels.venueLabel}
      </Text>
      <OptionChipRow
        layout="scroll"
        testIDPrefix="auto-pods-venue"
        options={options}
        value={value?.id ?? ''}
        onSelect={(id) => onChange(venues.find((venue) => venue.id === id) ?? null)}
      />
      {value && path ? (
        <Text testID="auto-pods-venue-category" fontSize={12} color="$muted">
          {labels.venueCategory(path)}
        </Text>
      ) : null}
      {value && !path ? (
        <Text testID="auto-pods-venue-no-category" fontSize={12} color={warning}>
          {labels.noVenueCategory}
        </Text>
      ) : null}
    </YStack>
  );
}
