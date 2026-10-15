import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { TabScreen } from '@/components/TabScreen';
import { AdCard } from '@/components/ads/AdCard';
import { EmptyState } from '@/components/EmptyState';
import { SearchPill } from '@/components/pod-list/SearchPill';
import { interleaveAds, isAdEntry } from '@/components/ads/interleaveAds';
import { VenueCard } from '@/components/hosts-venues';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useVenuesExplore } from '@/hooks/useVenuesExplore';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';

/** From mWeb's MUI `sm` breakpoint up (tablets, open foldables) the venues
 * sit two to a row, as the mWeb grid does; below it, one full-width card. */
const TWO_COLUMN_MIN_WIDTH = 600;
const SIDE_PADDING = 16;
const GAP = 12;

/** Venues discovery — venues in the header's selected location with a
 * server-side debounced search, filtered by the header's Super-category tiles
 * (the app-wide filter every other tab reads). Location is changed only from the
 * header. mWeb twin: /venues (VenuesPage). */
export function VenuesScreen() {
  const loadingRegion = useLoadingRegion();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { venues, searchInput, setSearchInput, isLoading, error } = useVenuesExplore();
  // A sponsored banner every 4 venues (server returns [] when none are booked).
  const { ads } = useActiveAds('VENUE_LIST');
  const bottomSpace = useBottomNavSpace();
  const { width } = useWindowDimensions();
  const twoColumns = width >= TWO_COLUMN_MIN_WIDTH;
  const cardWidth = twoColumns ? Math.floor((width - SIDE_PADDING * 2 - GAP) / 2) : '100%';

  return (
    <TabScreen testID="venues-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        {/* A tab, not a pushed screen, since the bar carries Venues now — so the
            last venue has to clear the floating bar itself. */}
        <YStack gap={GAP} padding={SIDE_PADDING} paddingBottom={bottomSpace}>
          <XStack>
            <SearchPill
              testID="venues-search"
              ariaLabel={t('mweb.venues.searchVenues')}
              placeholder={t('mweb.venues.searchVenuesByNameTypeOr')}
              value={searchInput}
              onChangeText={setSearchInput}
            />
          </XStack>
          {isLoading ? (
            <Spinner {...loadingRegion} testID="venues-loading" color="$primary" />
          ) : null}
          {!isLoading && error ? (
            <Text role="alert" testID="venues-error" fontSize={13} color="$danger">
              Could not load venues — please try again.
            </Text>
          ) : null}
          {!isLoading && !error && venues.length === 0 ? (
            <EmptyState
              icon="storefront"
              title="No venues found here yet — try another search or category."
              testID="venues-empty"
            />
          ) : null}
          <XStack testID="venues-grid" flexWrap="wrap" gap={GAP}>
            {interleaveAds(venues, ads, 4).map((entry) => {
              if (isAdEntry(entry)) {
                // A banner spans the whole row in either layout.
                return (
                  <YStack key={entry.key} width="100%">
                    <AdCard ad={entry.ad} variant="banner" />
                  </YStack>
                );
              }
              const venue = entry.item;
              return (
                <YStack key={venue.id} width={cardWidth}>
                  <VenueCard
                    venue={venue}
                    onOpen={() => navigation.navigate('VenueDetails', { venueId: venue.id })}
                  />
                </YStack>
              );
            })}
          </XStack>
        </YStack>
      </RefreshScrollView>
    </TabScreen>
  );
}
