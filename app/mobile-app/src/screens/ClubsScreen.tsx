import { useMemo, useState } from 'react';
import { YStack } from 'tamagui';

import { clubCityName } from '@duncit/utils';

import { Reveal } from '@/animations/Reveal';
import { FeedList } from '@/components/FeedList';
import { ClubsFeedRow } from '@/components/home/ClubsFeedRow';
import { ClubsLocationEmpty } from '@/components/home/ClubsLocationEmpty';
import { ClubsLocationNote } from '@/components/home/ClubsLocationNote';
import { ClubsSearchFilter } from '@/components/home/ClubsSearchFilter';
import { cityCardsFeed, localitySectionsFeed } from '@/components/home/clubs-feed';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { TabScreen } from '@/components/TabScreen';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useClubsFilter } from '@/hooks/useClubsFilter';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useTranslation } from '@/hooks/useTranslation';

/** Clubs tab — active communities with client-side search + category filter,
 * grouped by place. With no header location it lists city cards; opening one
 * (or picking a city in the header) lists that city's clubs by locality. An
 * empty header locality shows a Reset-Location prompt. mWeb twin: ClubsPage. */
export function ClubsScreen() {
  const { t } = useTranslation();
  const { clubs, pods, categories, isLoading } = useHomeData();
  const { selectedId: selectedLocationId, zoneName, locations } = useLocations();
  const { selectedSuperId } = useSuperCategories();
  const { openClub } = useDetailNav();
  // The city card opened from the city list; the header's own city wins over it.
  const [openCityId, setOpenCityId] = useState('');
  const activeCityId = selectedLocationId || openCityId;

  // Live pods per club — the muted count on each card (mWeb twin: ClubsPage).
  const podCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pods.forEach((pod) => counts.set(pod.club_id, (counts.get(pod.club_id) ?? 0) + 1));
    return counts;
  }, [pods]);

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
  // A sponsored banner every 4 clubs of a locality (server returns [] when none are booked).
  const { ads } = useActiveAds('CLUB_LIST');
  const otherAreas = t('mweb.clubsPage.otherAreas');
  const feed = useMemo(() => {
    if (!activeCityId) return cityCardsFeed(filtered, locations);
    const cityClubs = filtered.filter((club) => club.location_id === activeCityId);
    return localitySectionsFeed(cityClubs, ads, otherAreas);
  }, [activeCityId, filtered, locations, ads, otherAreas]);
  const openCity = selectedLocationId ? undefined : locations.find((l) => l.id === openCityId);

  // No club operates in the selected locality at all (vs. a search that matched nothing).
  const locationEmpty = !!selectedLocationId && locationClubs.length === 0;
  const emptyText = t('mweb.clubsPage.noClubsFound');
  const emptyState = locationEmpty ? (
    <ClubsLocationEmpty />
  ) : (
    <EmptyState icon="groups" title={emptyText} testID="clubs-list-empty" />
  );

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
      {openCity ? (
        <YStack paddingHorizontal={16} paddingTop={12}>
          <SectionHeader
            testID="clubs-city-heading"
            title={clubCityName(openCity)}
            actionLabel={t('mweb.clubsPage.allCities')}
            onAction={() => setOpenCityId('')}
            actionTestID="clubs-city-heading-action"
          />
        </YStack>
      ) : null}
      <FeedList
        testID="clubs-list"
        isLoading={isLoading}
        isEmpty={feed.length === 0}
        emptyText={emptyText}
        emptyComponent={emptyState}
        data={feed}
        keyExtractor={(entry) => entry.key}
        renderItem={(entry, index) => (
          <Reveal index={index} scale>
            <ClubsFeedRow
              entry={entry}
              podCounts={podCounts}
              onOpenCity={setOpenCityId}
              onOpenClub={openClub}
            />
          </Reveal>
        )}
      />
    </TabScreen>
  );
}
