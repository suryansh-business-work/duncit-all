import { useMemo } from 'react';

import { Reveal } from '@/animations/Reveal';
import { FeedList } from '@/components/FeedList';
import { ClubCard } from '@/components/home/ClubCard';
import { ClubsLocationNote } from '@/components/home/ClubsLocationNote';
import { ClubsSearchFilter } from '@/components/home/ClubsSearchFilter';
import { TabScreen } from '@/components/TabScreen';
import { useClubsFilter } from '@/hooks/useClubsFilter';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useLocations } from '@/hooks/useLocations';

/** Clubs tab — active communities in the selected location, with client-side
 * search + category filter. Changing the location re-scopes the list. */
export function ClubsScreen() {
  const { clubs, categories, isLoading, refetch } = useHomeData();
  const { selectedId: selectedLocationId } = useLocations();
  const { openClub } = useDetailNav();

  const locationClubs = useMemo(
    () =>
      selectedLocationId ? clubs.filter((club) => club.location_id === selectedLocationId) : clubs,
    [clubs, selectedLocationId],
  );

  const { query, setQuery, categoryId, setCategoryId, categoryOptions, filtered } = useClubsFilter(
    locationClubs,
    categories,
  );
  const isSearching = !!query || !!categoryId;
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
        onRefresh={refetch}
        data={filtered}
        keyExtractor={(club) => club.id}
        renderItem={(club, index) => (
          <Reveal index={index} scale>
            <ClubCard club={club} onPress={() => openClub(club.id, club.club_name)} />
          </Reveal>
        )}
      />
    </TabScreen>
  );
}
