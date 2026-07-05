import { useEffect, useRef, useState } from 'react';
import { RefreshControl, type ScrollView as RNScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';

import { Reveal } from '@/animations/Reveal';
import { HomeSkeleton } from '@/components/Skeleton';

import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useBranding } from '@/hooks/useBranding';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useHomeStore } from '@/stores/home.store';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ClubSection } from '@/components/home/ClubSection';
import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeFeaturedPods } from '@/components/home/HomeFeaturedPods';
import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { PreviousPodsRail } from '@/components/home/PreviousPodsRail';
import { StatusRail } from '@/components/status/StatusRail';
import { DEFAULT_HOME_FILTERS, activeFilterCount, type HomeFilters } from '@/utils/home-filters';

/** Scrollable home body — RN port of mWeb's HomePage. Owns the selected vibe
 * chip, fetches the feed, and renders the status rail, vibe chips, the
 * "Happening nearby" section, featured pods and per-club pod rows. */
export function HomeFeed() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [filters, setFilters] = useState<HomeFilters>(DEFAULT_HOME_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
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
    refetch,
  } = useHomeFeed(selectedCategoryId, filters);
  const filterCount = activeFilterCount(filters, selectedCategoryId);
  const bottomSpace = useBottomNavSpace();
  const { data: brandingData } = useBranding();
  const { data: meData } = useMe();
  const { primary, onPrimary } = useThemeColors();
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
        <YStack gap={20} paddingTop={12} paddingBottom={bottomSpace} testID="home-feed">
          <Reveal index={0}>
            <StatusRail userName={userName} userPhoto={userPhoto} />
          </Reveal>
          <Reveal index={1}>
            <HomeVibeChips
              categories={vibeCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              allIcon={brandingData?.branding.home_all_vibe_icon_url}
              action={
                <HomeFilterButton
                  count={filterCount}
                  disabled={!hasContent}
                  onPress={() => setFilterOpen(true)}
                />
              }
            />
          </Reveal>
          <YStack gap={16}>
            <Reveal index={2}>
              <HappeningNearbyHeader totalPods={totalPods} onPress={openHappeningNearby} />
            </Reveal>
            <Reveal index={3}>
              <HomeFeaturedPods
                pods={featuredPods}
                onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
              />
            </Reveal>
            {isEmpty ? (
              <Reveal index={4} scale>
                <Text
                  testID="home-empty"
                  textAlign="center"
                  fontSize={13}
                  color="$muted"
                  paddingHorizontal={24}
                  paddingVertical={32}
                >
                  No pods here yet. Pull to refresh or pick a different vibe.
                </Text>
              </Reveal>
            ) : (
              clubsWithPods.map(({ club, pods }, sectionIndex) => (
                <Reveal key={club.id} index={4 + sectionIndex}>
                  <ClubSection
                    club={club}
                    pods={pods}
                    onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
                    onOpenClub={(c) => openClub(c.id, c.club_name)}
                  />
                </Reveal>
              ))
            )}
            <Reveal index={5}>
              <PreviousPodsRail
                pods={previousPods}
                onSeeAll={openPreviousPods}
                onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
              />
            </Reveal>
          </YStack>
        </YStack>
      </ScrollView>
      {isHost ? (
        <XStack
          testID="home-create-pod-fab"
          role="button"
          aria-label="Create pod"
          onPress={() => navigation.navigate('CreatePod')}
          position="absolute"
          right={16}
          bottom={bottomSpace + 8}
          width={56}
          height={56}
          borderRadius={28}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primary"
          shadowColor="#000000"
          shadowOpacity={0.25}
          shadowRadius={12}
          shadowOffset={{ width: 0, height: 6 }}
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="add" size={28} color={onPrimary} />
        </XStack>
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
