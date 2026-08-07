import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, type ScrollView as RNScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, YStack } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';

import { Reveal } from '@/animations/Reveal';
import { HomeSkeleton } from '@/components/Skeleton';

import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useBranding } from '@/hooks/useBranding';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { TourAnchor } from '@/tours/TourAnchor';
import { useHomeStore } from '@/stores/home.store';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AdSlot } from '@/components/ads/AdSlot';
import { ClubRecommendationRow } from '@/components/home/ClubRecommendationRow';
import { ClubSection } from '@/components/home/ClubSection';
import { CreatePodFab } from '@/components/home/CreatePodFab';
import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeEmptyText } from '@/components/home/HomeEmptyText';
import { HomeFeaturedPods } from '@/components/home/HomeFeaturedPods';
import { HostCtaBanner } from '@/components/home/HostCtaBanner';
import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { PreviousPodsRail } from '@/components/home/PreviousPodsRail';
import { SomethingForYouRail } from '@/components/home/SomethingForYouRail';
import { VerifyEmailBanner } from '@/components/home/VerifyEmailBanner';
import { StatusRail } from '@/components/status/StatusRail';
import { useSavedPodHearts } from '@/hooks/useSavedPodHearts';
import { DEFAULT_HOME_FILTERS, activeFilterCount, type HomeFilters } from '@/utils/home-filters';

/** Scrollable home body — RN port of mWeb's HomePage. Owns the selected vibe
 * chip, fetches the feed, and renders the status rail, vibe chips, the
 * "Happening nearby" section, featured pods and per-club pod rows. */
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
    previousPods,
    totalPods,
    categoryLabelOf,
    refetch,
  } = useHomeFeed(selectedCategoryId, filters, showAllVibes);
  const filterCount = activeFilterCount(filters, selectedCategoryId);
  // A chip/filter narrows the rails; the full-list screens are unfiltered, so
  // the See-all cards drop their count + jump-to-index while one is active
  // (sort is excluded — it never changes rail membership). mWeb twin: HomePage.
  const railsFiltered =
    Boolean(selectedCategoryId) || filters.price !== 'ALL' || filters.date !== 'ALL';
  const bottomSpace = useBottomNavSpace();
  const { data: meData } = useMe();
  const saved = useSavedPodHearts();
  const { primary } = useThemeColors();
  const { openPod, openClub, openPreviousPods, openHappeningNearby } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  /**
   * Open one of our own paths, through our own deep link.
   *
   * The linking config already maps every mWeb path to a screen, so routing
   * an admin-entered path through it reuses that map instead of keeping a
   * second copy here that would drift the first time a route moved.
   */
  const openInAppPath = useCallback((path: string) => {
    fireAndForget(Linking.openURL(Linking.createURL(path)));
  }, []);
  const isHost = meData?.me?.roles?.includes('HOST') ?? false;

  // A logo tap bumps this nonce; scroll the feed back to the top in response.
  const scrollRef = useRef<RNScrollView>(null);
  const scrollTopNonce = useHomeStore((s) => s.scrollTopNonce);
  useEffect(() => {
    if (scrollTopNonce > 0) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollTopNonce]);

  const userName = meData?.me?.first_name ?? meData?.me?.full_name ?? 'You';
  const userPhoto = meData?.me?.profile_photo;
  const isEmpty = hasData && featuredPods.length === 0 && clubsWithPods.length === 0;

  if (isLoading && !hasData) {
    return <HomeSkeleton />;
  }

  return (
    <YStack flex={1}>
      <ScrollView
        ref={scrollRef}
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasData}
            onRefresh={refetch}
            tintColor={primary}
          />
        }
      >
        <YStack gap={26} paddingTop={16} paddingBottom={bottomSpace} testID="home-feed">
          <Reveal index={0}>
            <StatusRail userName={userName} userPhoto={userPhoto} />
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
                allLayout={brandingData?.branding.home_all_vibe_icon_layout}
                heading={brandingData?.branding.home_vibe_heading}
                subheading={brandingData?.branding.home_vibe_subheading}
                action={
                  <HomeFilterButton
                    count={filterCount}
                    disabled={!hasContent}
                    onPress={() => setFilterOpen(true)}
                  />
                }
              />
            </TourAnchor>
          </Reveal>
          <YStack gap={20}>
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
                  onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id)}
                  categoryLabelOf={categoryLabelOf}
                  savedOf={saved.signedIn ? saved.isSaved : undefined}
                  savingOf={saved.signedIn ? saved.isSaving : undefined}
                  onToggleSave={saved.signedIn ? saved.toggle : undefined}
                />
              </TourAnchor>
            </Reveal>
            <HostCtaBanner
              isHost={isHost}
              onCreatePod={() => navigation.navigate('CreatePod')}
              onBecomeHost={() => navigation.navigate('Earn')}
            />
            <ClubRecommendationRow
              clubs={clubsWithPods.map((entry) => entry.club)}
              onOpenClub={(club) => openClub(club.club_id)}
            />
            {isEmpty ? (
              <HomeEmptyText />
            ) : (
              // One anchor around the whole club list: the Clubs step describes
              // what clubs are, so it highlights the region rather than picking
              // an arbitrary row.
              <TourAnchor tour="home" anchor="home-clubs">
                <YStack gap={16}>
                  {clubsWithPods.map(({ club, pods }, sectionIndex) => (
                    <Reveal key={club.id} index={4 + sectionIndex}>
                      <ClubSection
                        club={club}
                        pods={pods}
                        onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id)}
                        onOpenClub={(c) => openClub(c.club_id)}
                        categoryLabelOf={categoryLabelOf}
                        savedOf={saved.signedIn ? saved.isSaved : undefined}
                        savingOf={saved.signedIn ? saved.isSaving : undefined}
                        onToggleSave={saved.signedIn ? saved.toggle : undefined}
                      />
                    </Reveal>
                  ))}
                </YStack>
              </TourAnchor>
            )}
            <Reveal index={5}>
              <PreviousPodsRail
                pods={previousPods}
                filtered={railsFiltered}
                onSeeAll={openPreviousPods}
                onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id)}
              />
            </Reveal>
            <Reveal index={6}>
              <SomethingForYouRail onOpenPath={openInAppPath} />
            </Reveal>
            <Reveal index={7}>
              <YStack paddingHorizontal={16}>
                <AdSlot position="HOME_BOTTOM" variant="banner" />
              </YStack>
            </Reveal>
          </YStack>
        </YStack>
      </ScrollView>
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
