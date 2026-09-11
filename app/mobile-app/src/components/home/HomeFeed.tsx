import { useEffect, useRef, useState } from 'react';
import type { ScrollView as RNScrollView } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';

import { Reveal } from '@/animations/Reveal';
import { HomeSkeleton } from '@/components/Skeleton';
import { RefreshScrollView } from '@/components/PullToRefresh';

import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useBranding } from '@/hooks/useBranding';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed, type HomePod } from '@/hooks/useHomeFeed';
import { TourAnchor } from '@/tours/TourAnchor';
import { useHomeStore } from '@/stores/home.store';
import { useMe } from '@/hooks/useMe';
import { AdSlot } from '@/components/ads/AdSlot';
import { ClubRecommendationRow } from '@/components/home/ClubRecommendationRow';
import { CreatePodFab } from '@/components/home/CreatePodFab';
import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeClubRails } from '@/components/home/HomeClubRails';
import { HomeFeaturedPods } from '@/components/home/HomeFeaturedPods';
import { HostCtaBanner } from '@/components/home/HostCtaBanner';
import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { HomeSearchRow } from '@/components/home/HomeSearchRow';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { OngoingPodsRail } from '@/components/home/OngoingPodsRail';
import { PreviousPodsRail } from '@/components/home/PreviousPodsRail';
import {
  SomethingForYouRail,
  openSomethingForYouTarget,
} from '@/components/home/SomethingForYouRail';
import { VerifyEmailBanner } from '@/components/home/VerifyEmailBanner';
import { StatusRail } from '@/components/status/StatusRail';
import { useSavedPodHearts } from '@/hooks/useSavedPodHearts';
import { DEFAULT_HOME_FILTERS, activeFilterCount, type HomeFilters } from '@/utils/home-filters';

/** Scrollable home body — RN port of mWeb's HomePage. Owns the selected vibe
 * chip, fetches the feed, and renders the search row, the status rail, vibe
 * chips, the "Happening nearby" section, featured pods and per-club pod rows. */
export function HomeFeed() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [filters, setFilters] = useState<HomeFilters>(DEFAULT_HOME_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: brandingData } = useBranding();
  const showAllVibes = brandingData?.branding.home_show_all_vibe_categories ?? false;
  const {
    isLoading,
    hasData,
    categoryChips,
    vibeCategories,
    hasContent,
    clubsWithPods,
    featuredPods,
    ongoingPods,
    previousPods,
    totalPods,
    categoryLabelOf,
  } = useHomeFeed(selectedCategoryId, filters, showAllVibes);
  // A chip/filter narrows the rails; the full-list screens are unfiltered, so the
  // See-all cards drop their count + jump-to-index (sort never changes membership).
  const railsFiltered =
    Boolean(selectedCategoryId) || filters.price !== 'ALL' || filters.date !== 'ALL';
  const bottomSpace = useBottomNavSpace();
  const { data: meData } = useMe();
  const saved = useSavedPodHearts();
  const savedOf = saved.signedIn ? saved.isSaved : undefined;
  const savingOf = saved.signedIn ? saved.isSaving : undefined;
  const onToggleSave = saved.signedIn ? saved.toggle : undefined;
  const { openPod, openClub, openPreviousPods, openHappeningNearby } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isHost = meData?.me?.roles?.includes('HOST') ?? false;

  // A logo tap bumps this nonce; scroll the feed back to the top in response.
  const scrollRef = useRef<RNScrollView>(null);
  const scrollTopNonce = useHomeStore((s) => s.scrollTopNonce);
  useEffect(() => {
    if (scrollTopNonce > 0) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollTopNonce]);

  const userName = meData?.me?.first_name ?? meData?.me?.full_name ?? 'You';
  const isEmpty = hasData && featuredPods.length === 0 && clubsWithPods.length === 0;
  const openFeedPod = (pod: HomePod) => openPod(pod.club_slug, pod.pod_id, pod.id);

  if (isLoading && !hasData) {
    return <HomeSkeleton />;
  }

  return (
    <YStack flex={1}>
      {/* The tab's shared pull-to-refresh reloads stories, ads and the bell too. */}
      <RefreshScrollView ref={scrollRef} flex={1} showsVerticalScrollIndicator={false}>
        {/* One 16px gutter (each row pads itself) and 24px between sections. */}
        <YStack gap={24} paddingTop={16} paddingBottom={bottomSpace} testID="home-feed">
          <Reveal index={0}>
            <HomeSearchRow
              filterCount={activeFilterCount(filters, selectedCategoryId)}
              filterDisabled={!hasContent}
              onSearch={() => navigation.navigate('Search')}
              onOpenFilters={() => setFilterOpen(true)}
            />
          </Reveal>
          <Reveal index={0}>
            <StatusRail userName={userName} userPhoto={meData?.me?.profile_photo} />
          </Reveal>
          <VerifyEmailBanner
            email={meData?.me?.email}
            verified={!!meData?.me?.is_email_verified}
            onPress={() => navigation.navigate('Profile', { verifyEmail: true })}
          />
          <Reveal index={1}>
            <TourAnchor tour="home" anchor="home-categories">
              <HomeVibeChips
                categories={vibeCategories}
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                allIcon={brandingData?.branding.home_all_vibe_icon_url}
              />
            </TourAnchor>
          </Reveal>
          <YStack gap={12}>
            <Reveal index={2}>
              <HappeningNearbyHeader totalPods={totalPods} onPress={openHappeningNearby} />
            </Reveal>
            <Reveal index={3}>
              <TourAnchor tour="home" anchor="home-pods">
                <HomeFeaturedPods
                  pods={featuredPods}
                  totalCount={totalPods}
                  filtered={railsFiltered}
                  onSeeAll={openHappeningNearby}
                  onOpenPod={openFeedPod}
                  categoryLabelOf={categoryLabelOf}
                  savedOf={savedOf}
                  savingOf={savingOf}
                  onToggleSave={onToggleSave}
                />
              </TourAnchor>
            </Reveal>
          </YStack>
          <OngoingPodsRail pods={ongoingPods} onOpenPod={openFeedPod} />
          <HostCtaBanner
            isHost={isHost}
            onCreatePod={() => navigation.navigate('CreatePod')}
            onBecomeHost={() => navigation.navigate('Earn')}
          />
          <ClubRecommendationRow
            clubs={clubsWithPods.map((entry) => entry.club)}
            onOpenClub={(club) => openClub(club.club_id)}
          />
          <HomeClubRails
            clubsWithPods={clubsWithPods}
            isEmpty={isEmpty}
            onOpenPod={openFeedPod}
            onOpenClub={(c) => openClub(c.club_id)}
            categoryLabelOf={categoryLabelOf}
            savedOf={savedOf}
            savingOf={savingOf}
            onToggleSave={onToggleSave}
          />
          <Reveal index={5}>
            <PreviousPodsRail
              pods={previousPods}
              filtered={railsFiltered}
              onSeeAll={openPreviousPods}
              onOpenPod={openFeedPod}
            />
          </Reveal>
          {/* No Reveal: an empty wrapper would still take a 24px gap. */}
          <SomethingForYouRail onOpen={openSomethingForYouTarget} />
          <Reveal index={7}>
            <YStack paddingHorizontal={16}>
              <AdSlot position="HOME_BOTTOM" variant="banner" />
            </YStack>
          </Reveal>
        </YStack>
      </RefreshScrollView>
      {isHost ? (
        <CreatePodFab bottom={bottomSpace + 8} onPress={() => navigation.navigate('CreatePod')} />
      ) : null}
      <HomeFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categoryChips={categoryChips}
        categoryId={selectedCategoryId}
        onCategory={setSelectedCategoryId}
        filters={filters}
        onChange={setFilters}
        onReset={() => {
          setFilters(DEFAULT_HOME_FILTERS);
          setSelectedCategoryId('');
        }}
      />
    </YStack>
  );
}
