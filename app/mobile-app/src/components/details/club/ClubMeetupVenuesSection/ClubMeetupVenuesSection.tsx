import { useState } from 'react';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { MapEmbed } from '@/components/MapEmbed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDistance, haversineKm } from '@/utils/distance';
import { VenueCard, type ClubVenue } from './VenueCard';

type Origin = { lat: number; lng: number };

interface Props {
  venues: ClubVenue[];
  onOpenVenue: (venueId: string) => void;
}

function addressParts(venue: ClubVenue): string[] {
  return [
    venue.venue_name,
    venue.address_line1,
    venue.address_line2,
    venue.locality,
    venue.city,
    venue.state,
    venue.postal_code,
    venue.country,
  ].filter((part): part is string => !!part);
}

/** Best-effort device location — null when denied/unavailable, never throws. */
async function currentOrigin(): Promise<Origin | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** The club's linked venues — "We usually meet". RN port of mWeb's
 * ClubMeetupVenuesSection: venue rail, optional distances, the selected
 * venue's address and its map preview. */
export function ClubMeetupVenuesSection({ venues, onOpenVenue }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  // No selection yet → the first venue leads. Also the empty-club guard.
  const selected = venues.find((venue) => venue.id === selectedId) ?? venues[0];
  if (!selected) return null;

  const venueDistance = (venue: ClubVenue): string | null => {
    if (!origin || typeof venue.lat !== 'number' || typeof venue.lng !== 'number') return null;
    return formatDistance(haversineKm(origin.lat, origin.lng, venue.lat, venue.lng));
  };

  const locateMe = async () => {
    setLocating(true);
    const next = await currentOrigin();
    if (next) setOrigin(next);
    setLocating(false);
  };

  const parts = addressParts(selected);
  const mapQuery =
    selected.lat != null && selected.lng != null
      ? `${selected.lat},${selected.lng}`
      : parts.join(', ');

  return (
    <YStack gap={8} testID="club-venues">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="900" color="$color">
          We usually meet
        </Text>
        {origin ? null : (
          <XStack
            testID="club-venues-locate"
            role="button"
            aria-label="Show distance"
            onPress={locateMe}
            alignItems="center"
            gap={4}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="near-me" size={14} color={primary} />
            <Text fontSize={13} fontWeight="800" color="$primary">
              {locating ? 'Locating…' : 'Show distance'}
            </Text>
          </XStack>
        )}
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            distance={venueDistance(venue)}
            onSelect={() => setSelectedId(venue.id)}
            onOpen={() => onOpenVenue(venue.id)}
          />
        ))}
      </ScrollView>
      <Text fontSize={13} color="$muted" testID="club-venue-address">
        {parts.join(', ')}
      </Text>
      <XStack
        testID="club-venue-open-selected"
        role="button"
        aria-label="Open venue details"
        onPress={() => onOpenVenue(selected.id)}
        alignItems="center"
        alignSelf="flex-start"
        gap={4}
        pressStyle={{ opacity: 0.7 }}
      >
        <Text fontSize={13} fontWeight="800" color="$primary">
          Open venue details
        </Text>
        <MaterialIcons name="open-in-new" size={13} color={primary} />
      </XStack>
      <MapEmbed query={mapQuery} />
    </YStack>
  );
}
