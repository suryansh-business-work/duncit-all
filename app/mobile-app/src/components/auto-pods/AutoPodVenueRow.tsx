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
import { useSelectedVenue } from '@/hooks/useSelectedVenue';
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
 * list is what it is. It opens on the venue picked on any Venue Studio screen
 * (the first one when that pick is not an approved venue); a venue with no
 * category is offered nothing, and says so.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodVenuePicker` (rule 27).
 */
export function AutoPodVenueRow({ value, onChange, labels }: Readonly<Props>) {
  const { warning } = useThemeColors();
  const { venues, loaded } = useAutoPodVenues();

  // The shared pick drives the queue: a chip tap moves it, and the queue
  // follows — so the next venue screen opens on the same venue.
  const { venue: picked, selectVenue } = useSelectedVenue(venues);

  useEffect(() => {
    if (picked && picked.id !== value?.id) onChange(picked);
  }, [picked, value, onChange]);

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
    <YStack testID="auto-pods-venue-row" gap={8}>
      <Text fontSize={13} fontWeight="600" color="$muted">
        {labels.venueLabel}
      </Text>
      <OptionChipRow
        layout="scroll"
        testIDPrefix="auto-pods-venue"
        options={options}
        value={value?.id ?? ''}
        onSelect={selectVenue}
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
