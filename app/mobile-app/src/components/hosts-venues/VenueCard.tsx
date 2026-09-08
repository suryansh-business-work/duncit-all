import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { venueImages } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicVenue } from '@/hooks/useHostsVenues';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { VenueCardMedia } from './VenueCardMedia';

/** Compact venue label "City · State" from the optional location fields. */
export function venueLocation(venue: PublicVenue): string {
  return [venue.locality, venue.city, venue.state].filter(Boolean).join(' · ');
}

export interface VenueCardProps {
  venue: PublicVenue;
  onOpen: () => void;
}

/** Venue row in the discovery list — an image slider over every photo the venue
 * has, then name, type/capacity and location. RN twin of mWeb's
 * VenueExploreCard. */
export function VenueCard({ venue, onOpen }: Readonly<VenueCardProps>) {
  const { muted } = useThemeColors();
  const location = venueLocation(venue);

  return (
    <YStack
      testID={`venue-card-${venue.id}`}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {/* The slider owns its own taps (the arrows must not navigate), so the
          card is not one big pressable any more — the photo and the name block
          each open the venue themselves. mWeb twin does the same. */}
      <VenueCardMedia images={venueImages(venue)} venueName={venue.venue_name} onOpen={onOpen} />
      {/* The name block paints its own opaque surface and sits above the cover
          in the stacking order — a busy photo above it is what made the venue
          name hard to pick out. mWeb twin does the same. */}
      <YStack
        role="button"
        aria-label={venue.venue_name}
        onPress={onOpen}
        pressStyle={PRESS_STYLE.surface}
        padding={12}
        gap={3}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderColor="$borderColor"
      >
        <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
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
