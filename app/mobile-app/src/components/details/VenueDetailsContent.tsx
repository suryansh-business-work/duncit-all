import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { MapEmbed } from '@/components/MapEmbed';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
import { HeroCarousel } from '@/components/details/DetailHero';
import { VenueImagesGrid } from '@/components/details/VenueImagesGrid';
import { VenuePodsSection } from '@/components/details/VenuePodsSection';
import { FOOD_CART_BUTTON_SPACE } from '@/components/details/venue-food/FoodCartBar';
import { VenueFoodMenuSection } from '@/components/details/venue-food/VenueFoodMenuSection';
import { VenueFoodOrderingScope } from '@/components/details/venue-food/VenueFoodOrderingScope';
import type { PublicVenueDetails as PublicVenue } from '@/hooks/useHostsVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The scroll body's side padding — the hero spans the width inside it. */
const PAGE_PADDING = 16;

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

interface Props {
  venue: PublicVenue;
  gallery: string[];
  /** Re-read the venue — the food menu asks for it when a dish has left the menu. */
  onRefresh: () => Promise<unknown>;
}

/** The scrollable venue body — cover, chips, description, menu, location,
 * amenities and gallery — with the food cart button floating over it when the
 * venue serves food. Split out of the screen so its loading/error chain stays simple. */
export function VenueDetailsContent({ venue, gallery, onRefresh }: Readonly<Props>) {
  const { accent, brand } = useThemeColors();
  const { t } = useTranslation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  // Room under the last row for the floating cart button, wherever a venue can show one.
  const paddingBottom = 32 + (venue.offers_food ? FOOD_CART_BUTTON_SPACE : 0);
  return (
    <VenueFoodOrderingScope venue={venue} onRefresh={onRefresh}>
      <RefreshScrollView flex={1} contentContainerStyle={{ padding: PAGE_PADDING, gap: 20, paddingBottom }}>
        <HeroCarousel
          media={gallery.map((url) => ({ url, type: 'IMAGE' }))}
          width={windowWidth - PAGE_PADDING * 2}
          height={240}
          placeholder={<MaterialIcons name="storefront" size={44} color={brand} />}
          onOpen={setViewerIndex}
        />

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
        {venue.offers_food ? <VenueFoodMenuSection venue={venue} /> : null}

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

        <ImageViewerModal
          images={gallery}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      </RefreshScrollView>
    </VenueFoodOrderingScope>
  );
}
