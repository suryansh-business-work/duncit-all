import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { StackScreen } from '@/components/StackScreen';
import { VenueDetailsContent } from '@/components/details/VenueDetailsContent';
import { useVenueDetails } from '@/hooks/useHostsVenues';
import { useLocationMismatch } from '@/hooks/useLocationMismatch';
import { LocationMismatchDialog } from '@/components/LocationMismatchDialog';
import type { RootStackParamList } from '@/navigation/types';
import { venueImages } from '@duncit/utils';
import { useLoadingRegion } from '@/components/Skeleton';

/** Venue details — cover, chips, description, the food menu and its cart,
 * location, amenities, gallery. RN twin of mWeb's VenueDetailsPage. */
export function VenueDetailsScreen() {
  const loadingRegion = useLoadingRegion();
  const route = useRoute<RouteProp<RootStackParamList, 'VenueDetails'>>();
  const venueId = route.params?.venueId ?? '';
  const { venue, isLoading, error, refetch } = useVenueDetails(venueId);
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
      <VenueDetailsContent venue={venue} gallery={gallery} onRefresh={refetch} />
    );

  return (
    <StackScreen title={venue?.venue_name || 'Venue'} testID="venue-details-screen">
      {isLoading && !venue ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner {...loadingRegion} testID="venue-details-loading" color="$primary" />
        </YStack>
      ) : (
        body
      )}
      <LocationMismatchDialog kind="VENUE" {...locationPrompt} />
    </StackScreen>
  );
}
