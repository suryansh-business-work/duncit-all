import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { MapEmbed } from '@/components/MapEmbed';
import { SectionHeader } from '@/components/SectionHeader';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
import { VenueImagesGrid } from '@/components/details/VenueImagesGrid';
import { VenuePodsSection } from '@/components/details/VenuePodsSection';
import { useVenueDetails, type PublicVenue } from '@/hooks/useHostsVenues';
import { useLocationMismatch } from '@/hooks/useLocationMismatch';
import { LocationMismatchDialog } from '@/components/LocationMismatchDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { venueImages } from '@duncit/utils';
import { RefreshScrollView } from '@/components/PullToRefresh';

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

/** The map preview's place: the pin when the venue has one, else its address
 * (mWeb twin: VenueLocationCard's VenueMapPreview). */
const mapQuery = (venue: PublicVenue): string =>
  venue.lat != null && venue.lng != null ? `${venue.lat},${venue.lng}` : addressLine(venue);

/** A soft info pill — venue type, capacity, tags, amenities. */
function Chip({ label }: Readonly<{ label: string }>) {
  return (
    <XStack borderRadius={999} paddingHorizontal={12} paddingVertical={6} backgroundColor="$soft">
      <Text fontSize={13} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

/** Amenities / Facilities / Security: a surface card of soft pills. mWeb twin:
 * venues-page/VenueChipsSection. */
function ChipsGroup({ title, items }: Readonly<{ title: string; items?: string[] | null }>) {
  if (!items?.length) return null;
  return (
    <SurfaceCard gap={12}>
      <SectionHeader title={title} />
      <XStack flexWrap="wrap" gap={8}>
        {items.map((item) => (
          <Chip key={item} label={item} />
        ))}
      </XStack>
    </SurfaceCard>
  );
}

/** The scrollable venue body — cover, chips, description, location, amenities and
 * gallery. Split out of the screen so the loading/error chain stays simple. */
function VenueDetailsContent({
  venue,
  gallery,
}: Readonly<{ venue: PublicVenue; gallery: string[] }>) {
  const { accent } = useThemeColors();
  const { t } = useTranslation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  return (
    <RefreshScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <YStack
        height={240}
        borderRadius={24}
        overflow="hidden"
        backgroundColor="$soft"
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
          <MaterialIcons name="storefront" size={44} color={accent} />
        )}
      </YStack>

      <YStack gap={10}>
        <TwoToneHeading lead={venue.venue_name} />
        <XStack flexWrap="wrap" gap={8}>
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
      </YStack>

      <SurfaceCard gap={12}>
        <SectionHeader title={t('mweb.common.location')} />
        <XStack alignItems="center" gap={12}>
          <YStack
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="$soft"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="place" size={18} color={accent} />
          </YStack>
          <Text testID="venue-address" flex={1} fontSize={14} color="$muted">
            {addressLine(venue) || 'Address not provided'}
          </Text>
        </XStack>
        <MapEmbed query={mapQuery(venue)} />
      </SurfaceCard>

      <VenuePodsSection venueId={venue.id} />

      <ChipsGroup title={t('mweb.common.amenities')} items={venue.amenities} />
      <ChipsGroup title={t('mweb.common.facilities')} items={venue.facilities} />
      <ChipsGroup title={t('mweb.common.venueSecurity')} items={venue.security} />

      <VenueImagesGrid images={gallery} onOpen={setViewerIndex} />

      <ImageViewerModal images={gallery} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </RefreshScrollView>
  );
}

/** Read-only venue details — cover, chips, description, location, amenities,
 * gallery. RN twin of mWeb's VenueDetailsPage. */
export function VenueDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VenueDetails'>>();
  const venueId = route.params?.venueId ?? '';
  const { venue, isLoading, error } = useVenueDetails(venueId);
  const locationPrompt = useLocationMismatch(
    venue ? { id: venue.location_id, zone: venue.locality } : null,
  );
  const gallery: string[] = venueImages(venue);
  const body =
    error || !venue ? (
      <EmptyState
        icon="storefront"
        title="This venue is unavailable or not approved yet."
        testID="venue-details-missing"
      />
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
      <LocationMismatchDialog kind="VENUE" {...locationPrompt} />
    </StackScreen>
  );
}
