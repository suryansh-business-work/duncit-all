import { Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodVenue } from '../../create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { VenueSpace } from './venueSpaces';

/** One bookable space — its capacity is the pod's No. of spots. `name` is the
 * space as the host reads it (the whole-venue pseudo-space is ours to word; a
 * named capacity item is the venue partner's own). */
function SpaceChip({
  space,
  name,
  selected,
  onPick,
}: Readonly<{
  space: VenueSpace;
  name: string;
  selected: boolean;
  onPick: (space: VenueSpace) => void;
}>) {
  const { t } = useTranslation();
  const label = t('mweb.createPod.spaceOption', {
    vars: { label: name, capacity: space.capacity },
  });
  return (
    <XStack
      testID={`create-pod-space-${space.label}`}
      tabIndex={0}
      role="radio"
      aria-label={label}
      aria-checked={selected}
      onPress={() => onPick(space)}
      minHeight={36}
      alignItems="center"
      paddingHorizontal={14}
      borderRadius={999}
      backgroundColor={selected ? '$primary' : '$soft'}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** The picked venue's total capacity + its bookable spaces (slots follow). */
export function VenueSpaceCard({
  venue,
  spaces,
  spaceLabel,
  spaceError,
  onPick,
}: Readonly<{
  venue: CreatePodVenue;
  spaces: VenueSpace[];
  spaceLabel: string;
  spaceError?: string;
  onPick: (space: VenueSpace) => void;
}>) {
  const { t } = useTranslation();
  const spaceName = (space: VenueSpace) =>
    space.slotSpaceLabel ? space.label : t('mweb.slots.wholeVenue');
  return (
    <SurfaceCard gap={12}>
      <Text testID="create-pod-venue-capacity" fontSize={14} fontWeight="600" color="$color">
        {venue.venue_type ? `${venue.venue_type} · ` : ''}
        {t('mweb.createPod.totalCapacity', { vars: { count: venue.capacity ?? 0 } })}
      </Text>
      <YStack gap={8}>
        <FieldLabel label={t('mweb.createPod.spaceCapacity')} required testID="create-pod-space" />
        <XStack
          gap={8}
          flexWrap="wrap"
          role="radiogroup"
          aria-label={t('mweb.createPod.spaceCapacity')}
        >
          {spaces.map((space) => (
            <SpaceChip
              key={space.label}
              space={space}
              name={spaceName(space)}
              selected={spaceLabel === space.label}
              onPick={onPick}
            />
          ))}
        </XStack>
        <Text fontSize={12} color={spaceError ? '$danger' : '$muted'}>
          {spaceError ?? t('mweb.createPod.spaceHint')}
        </Text>
      </YStack>
    </SurfaceCard>
  );
}

/** Own venues book instantly; every other venue approves the slot first. */
export function SlotApprovalNote({ ownVenue }: Readonly<{ ownVenue: boolean }>) {
  const { t } = useTranslation();
  return (
    <YStack padding={12} borderRadius={14} backgroundColor={ownVenue ? '$successSoft' : '$soft'}>
      <Text testID="create-pod-approval-note" fontSize={13} fontWeight="500" color="$color">
        {ownVenue ? t('mweb.createPod.ownVenueNote') : t('mweb.createPod.venueApprovalNote')}
      </Text>
    </YStack>
  );
}
