import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { isPickedVenue } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm, CreatePodVenue } from './create-pod.types';

/**
 * Whether the form is still on the venue picked from Venue Details (and so
 * physical): What hides the mode, Where & when offers that venue alone.
 */
export function usePickedVenueLock(form: CreatePodForm, pickedVenueId: string | undefined): boolean {
  return form.watch('pod_mode') === 'PHYSICAL' && isPickedVenue(pickedVenueId, form.watch('venue_id'));
}

/**
 * Over What and Where & when while the pod is on the venue picked from Venue
 * Details: says the venue and a physical pod are already chosen, so the host
 * knows why there is no mode or venue list to pick from. mWeb twin.
 */
export function PickedVenueNote({ venues, venueId }: Readonly<{ venues: CreatePodVenue[]; venueId: string }>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const venue = venues.find((row) => row.id === venueId);
  if (!venue) return null;
  return (
    <XStack
      testID="create-pod-picked-venue"
      role="note"
      gap={8}
      alignItems="flex-start"
      backgroundColor="$soft"
      borderRadius={14}
      padding={12}
    >
      <MaterialIcons name="storefront" size={16} color={color} aria-hidden />
      <YStack flex={1} gap={4}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('mweb.createPod.pickedVenue.title', { vars: { venue: venue.venue_name } })}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {t('mweb.createPod.pickedVenue.hint')}
        </Text>
      </YStack>
    </XStack>
  );
}
