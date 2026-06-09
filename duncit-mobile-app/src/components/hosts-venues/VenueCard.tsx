import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicVenue } from '@/hooks/useHostsVenues';

/** Compact venue label "City · State" from the optional location fields. */
export function venueLocation(venue: PublicVenue): string {
  return [venue.locality, venue.city, venue.state].filter(Boolean).join(' · ');
}

export interface VenueCardProps {
  venue: PublicVenue;
  onOpen: () => void;
}

/** Venue row in the discovery list — cover, name, type/capacity, location.
 * RN twin of mWeb's VenueList card. */
export function VenueCard({ venue, onOpen }: Readonly<VenueCardProps>) {
  const { onPrimary, muted } = useThemeColors();
  const location = venueLocation(venue);

  return (
    <YStack
      testID={`venue-card-${venue.id}`}
      role="button"
      aria-label={venue.venue_name}
      onPress={onOpen}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
      pressStyle={{ opacity: 0.9 }}
    >
      <YStack height={120} backgroundColor="$primary" alignItems="center" justifyContent="center">
        {venue.cover_image_url ? (
          <Image
            source={{ uri: venue.cover_image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="storefront" size={34} color={onPrimary} />
        )}
      </YStack>
      <YStack padding={12} gap={3}>
        <Text fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
          {venue.venue_name}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {[venue.venue_type, venue.capacity ? `${venue.capacity} capacity` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {location ? (
          <XStack alignItems="center" gap={4}>
            <MaterialIcons name="place" size={13} color={muted} />
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              {location}
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}
