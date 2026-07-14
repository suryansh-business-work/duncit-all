import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ClubDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ClubVenue = ClubDetail['matched_venues'][number];

interface Props {
  venue: ClubVenue;
  distance: string | null;
  onSelect: () => void;
  onOpen: () => void;
}

/** One venue in the "We usually meet" rail — tap the card to select it, or the
 * link to open its venue screen. */
export function VenueCard({ venue, distance, onSelect, onOpen }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <YStack
      testID={`club-venue-${venue.id}`}
      role="button"
      aria-label={venue.venue_name}
      onPress={onSelect}
      width={220}
      gap={4}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
        {venue.venue_name}
      </Text>
      <Text fontSize={12} color="$muted">
        {[venue.locality, venue.city].filter(Boolean).join(', ')}
      </Text>
      {distance ? (
        <XStack
          testID={`club-venue-distance-${venue.id}`}
          alignItems="center"
          alignSelf="flex-start"
          gap={4}
          paddingHorizontal={8}
          paddingVertical={3}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <MaterialIcons name="near-me" size={12} color={primary} />
          <Text fontSize={11} fontWeight="800" color="$color">
            {distance}
          </Text>
        </XStack>
      ) : null}
      <XStack
        testID={`club-venue-open-${venue.id}`}
        role="button"
        aria-label={`Venue details for ${venue.venue_name}`}
        onPress={onOpen}
        alignItems="center"
        alignSelf="flex-start"
        gap={4}
        pressStyle={{ opacity: 0.7 }}
      >
        <Text fontSize={13} fontWeight="800" color="$primary">
          Venue details
        </Text>
        <MaterialIcons name="open-in-new" size={13} color={primary} />
      </XStack>
    </YStack>
  );
}
