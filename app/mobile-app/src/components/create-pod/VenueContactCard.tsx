import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodVenue } from './create-pod.types';

/** Venue partner contact details, shared with the host for slot follow-up. */
export function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID="create-pod-venue-contact"
      gap={10}
      padding={12}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      alignItems="flex-start"
    >
      <MaterialIcons name="support-agent" size={18} color={primary} />
      <YStack gap={2} flex={1}>
        <Text fontSize={12} fontWeight="800" color="$muted">
          Venue contact for follow-up
        </Text>
        <Text fontSize={14} fontWeight="800" color="$color">
          {venue.owner_name || venue.venue_name}
        </Text>
        {venue.owner_phone ? (
          <Text fontSize={13} color="$color">
            {venue.owner_phone}
          </Text>
        ) : null}
        {venue.owner_email ? (
          <Text fontSize={13} color="$color">
            {venue.owner_email}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
