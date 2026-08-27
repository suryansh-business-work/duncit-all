import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { StackScreen } from '@/components/StackScreen';
import { VenueImagesGrid } from '@/components/details/VenueImagesGrid';
import { VenuePodsSection } from '@/components/details/VenuePodsSection';
import { useVenueDetails, type PublicVenue } from '@/hooks/useHostsVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

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

function ChipsGroup({ title, items }: Readonly<{ title: string; items?: string[] | null }>) {
  if (!items?.length) return null;
  return (
    <YStack gap={8}>
      <Text fontSize={15} fontWeight="700" color="$color">
        {title}
      </Text>
      <XStack flexWrap="wrap" gap={6}>
        {items.map((item) => (
          <Chip key={item} label={item} />
        ))}
      </XStack>
    </YStack>
  );
}

/** The scrollable venue body — cover, chips, description, location, amenities and
 * gallery. Split out of the screen so the loading/error chain stays simple. */
function VenueDetailsContent({
  venue,
  gallery,
}: Readonly<{ venue: PublicVenue; gallery: string[] }>) {
  const { onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  return (
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
          <XStack
            pressStyle={PRESS_STYLE.surface}
            testID="venue-cover-image"
            role="button"
            aria-label={t('mweb.podDetails.viewImage')}
            onPress={() => setViewerIndex(0)}
            width="100%"
            height="100%"
          >
            <AppImage
              source={{ uri: gallery[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </XStack>
        ) : (
          <MaterialIcons name="storefront" size={44} color={onPrimary} />
        )}
      </YStack>

      <Text fontSize={22} fontWeight="700" color="$color">
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
        <Text fontSize={15} fontWeight="700" color="$color">
          Location
        </Text>
      </XStack>
      <Text testID="venue-address" fontSize={13} color="$muted">
        {addressLine(venue) || 'Address not provided'}
      </Text>

      <VenuePodsSection venueId={venue.id} />

      <ChipsGroup title={t('mweb.common.amenities')} items={venue.amenities} />
      <ChipsGroup title={t('mweb.common.facilities')} items={venue.facilities} />
      <ChipsGroup title={t('mweb.common.venueSecurity')} items={venue.security} />

      <VenueImagesGrid images={gallery} onOpen={setViewerIndex} />

      <ImageViewerModal images={gallery} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </ScrollView>
  );
}

/** Read-only venue details — cover, chips, description, location, amenities,
 * gallery. RN twin of mWeb's VenueDetailsPage. */
export function VenueDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VenueDetails'>>();
  const venueId = route.params?.venueId ?? '';
  const { venue, isLoading, error } = useVenueDetails(venueId);
  const gallery: string[] = venue
    ? Array.from(
        new Set(
          [venue.cover_image_url, ...(venue.gallery ?? [])].filter((url): url is string => !!url),
        ),
      )
    : [];
  const body =
    error || !venue ? (
      <Text testID="venue-details-missing" padding={24} color="$muted">
        This venue is unavailable or not approved yet.
      </Text>
    ) : (
      <VenueDetailsContent venue={venue} gallery={gallery} />
    );

  return (
    <StackScreen title={venue?.venue_name || 'Venue'} testID="venue-details-screen">
      {isLoading && !venue ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="venue-details-loading" color="$primary" />
        </YStack>
      ) : (
        body
      )}
    </StackScreen>
  );
}
