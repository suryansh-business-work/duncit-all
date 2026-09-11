import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { venueImages } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
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

/** Venue row in the discovery list — a surface card with an image slider over
 * every photo the venue has (18px corners inside the padding), then name,
 * type/capacity and location. RN twin of mWeb's VenueExploreCard. */
export function VenueCard({ venue, onOpen }: Readonly<VenueCardProps>) {
  const { muted } = useThemeColors();
  const location = venueLocation(venue);

  return (
    <SurfaceCard testID={`venue-card-${venue.id}`} padding={8}>
      {/* The slider owns its own taps (the arrows must not navigate), so the
          card is not one big pressable any more — the photo and the name block
          each open the venue themselves. mWeb twin does the same. */}
      <VenueCardMedia images={venueImages(venue)} venueName={venue.venue_name} onOpen={onOpen} />
      <YStack
        role="button"
        aria-label={venue.venue_name}
        onPress={onOpen}
        pressStyle={PRESS_STYLE.surface}
        paddingHorizontal={8}
        paddingTop={10}
        paddingBottom={6}
        gap={3}
      >
        <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
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
    </SurfaceCard>
  );
}
