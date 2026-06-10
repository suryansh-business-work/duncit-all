import { Image } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useVenueDetails, type PublicVenue } from '@/hooks/useHostsVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

function addressLine(venue: PublicVenue): string {
  return [
    venue.address_line1,
    venue.address_line2,
    venue.locality,
    venue.city,
    venue.state,
    venue.postal_code,
    venue.country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');
}

function Chip({ label }: Readonly<{ label: string }>) {
  return (
    <XStack
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={4}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={12} fontWeight="700" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

/** Read-only venue details — cover, chips, description, location, amenities,
 * gallery. RN twin of mWeb's VenueDetailsPage. */
export function VenueDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VenueDetails'>>();
  const venueId = route.params?.venueId ?? '';
  const { venue, isLoading, error } = useVenueDetails(venueId);
  const { onPrimary, primary } = useThemeColors();
  const gallery = venue ? [venue.cover_image_url, ...(venue.gallery ?? [])].filter(Boolean) : [];

  return (
    <StackScreen title={venue?.venue_name || 'Venue'} testID="venue-details-screen">
      {isLoading && !venue ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="venue-details-loading" color="$primary" />
        </YStack>
      ) : error || !venue ? (
        <Text testID="venue-details-missing" padding={24} color="$muted">
          This venue is unavailable or not approved yet.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
          <YStack
            height={200}
            borderRadius={16}
            overflow="hidden"
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            {gallery[0] ? (
              <Image
                source={{ uri: gallery[0] as string }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="storefront" size={44} color={onPrimary} />
            )}
          </YStack>

          <Text fontSize={22} fontWeight="900" color="$color">
            {venue.venue_name}
          </Text>
          <XStack flexWrap="wrap" gap={6}>
            {venue.venue_type ? <Chip label={venue.venue_type} /> : null}
            {venue.capacity ? <Chip label={`${venue.capacity} capacity`} /> : null}
            {(venue.tags ?? []).map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </XStack>

          {venue.description ? (
            <Text fontSize={14} color="$muted" lineHeight={20}>
              {venue.description}
            </Text>
          ) : null}

          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="place" size={16} color={primary} />
            <Text fontSize={15} fontWeight="900" color="$color">
              Location
            </Text>
          </XStack>
          <Text testID="venue-address" fontSize={13} color="$muted">
            {addressLine(venue) || 'Address not provided'}
          </Text>

          {venue.amenities && venue.amenities.length > 0 ? (
            <YStack gap={8}>
              <Text fontSize={15} fontWeight="900" color="$color">
                Amenities
              </Text>
              <XStack flexWrap="wrap" gap={6}>
                {venue.amenities.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </XStack>
            </YStack>
          ) : null}

          {gallery.length > 1 ? (
            <YStack gap={8}>
              <Text fontSize={15} fontWeight="900" color="$color">
                Images
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {gallery.slice(1).map((url) => (
                  <Image
                    key={url as string}
                    testID="venue-gallery-image"
                    source={{ uri: url as string }}
                    style={{ width: '31%', aspectRatio: 4 / 3, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ))}
              </XStack>
            </YStack>
          ) : null}
        </ScrollView>
      )}
    </StackScreen>
  );
}
