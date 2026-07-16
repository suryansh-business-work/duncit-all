import { useMemo } from 'react';

import { Reveal } from '@/animations/Reveal';
import { FeedList } from '@/components/FeedList';
import { AdCard } from '@/components/ads/AdCard';
import { interleaveAds, isAdEntry } from '@/components/ads/interleaveAds';
import { ClubCard } from '@/components/home/ClubCard';
import { ClubsLocationEmpty } from '@/components/home/ClubsLocationEmpty';
import { ClubsLocationNote } from '@/components/home/ClubsLocationNote';
import { ClubsSearchFilter } from '@/components/home/ClubsSearchFilter';
import { TabScreen } from '@/components/TabScreen';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useClubsFilter } from '@/hooks/useClubsFilter';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';

/** Clubs tab — active communities in the selected location, with client-side
 * search + category filter. Selecting a Country > City > Area location re-scopes
 * the list to that locality; an empty locality shows a Reset-Location prompt. */
export function ClubsScreen() {
  const { clubs, categories, isLoading, refetch } = useHomeData();
  const { selectedId: selectedLocationId, zoneName } = useLocations();
  const { selectedSuperId } = useSuperCategories();
  const { openClub } = useDetailNav();

  const locationClubs = useMemo(() => {
    if (!selectedLocationId) return clubs;
    return clubs.filter(
      (club) =>
        club.location_id === selectedLocationId && (!zoneName || club.locality === zoneName),
    );
  }, [clubs, selectedLocationId, zoneName]);

  const { query, setQuery, categoryId, setCategoryId, categoryOptions, filtered } = useClubsFilter(
    locationClubs,
    categories,
    selectedSuperId,
  );
  // A sponsored banner every 4 clubs (server returns [] when none are booked).
  const { ads } = useActiveAds('CLUB_LIST');
  const feed = useMemo(() => interleaveAds(filtered, ads, 4), [filtered, ads]);
  const isSearching = !!query || !!categoryId;
  // No club operates in the selected locality at all (vs. a search that matched nothing).
  const locationEmpty = !!selectedLocationId && locationClubs.length === 0;
  const emptyText = isSearching ? 'No clubs match your search.' : 'No clubs yet. Pull to refresh.';

  return (
    <TabScreen testID="clubs-screen">
      <ClubsLocationNote />
      <ClubsSearchFilter
        query={query}
        onQueryChange={setQuery}
        categoryId={categoryId}
        categoryOptions={categoryOptions}
        onCategoryChange={setCategoryId}
      />
      <FeedList
        testID="clubs-list"
        isLoading={isLoading}
        isEmpty={filtered.length === 0}
        emptyText={emptyText}
        emptyComponent={locationEmpty ? <ClubsLocationEmpty /> : undefined}
        onRefresh={refetch}
        data={feed}
        keyExtractor={(entry) => (isAdEntry(entry) ? entry.key : entry.item.id)}
        renderItem={(entry, index) => (
          <Reveal index={index} scale>
            {isAdEntry(entry) ? (
              <AdCard ad={entry.ad} variant="banner" />
            ) : (
              <ClubCard
                club={entry.item}
                onPress={() => openClub(entry.item.id, entry.item.club_name)}
              />
            )}
          </Reveal>
        )}
      />
    </TabScreen>
  );
}
