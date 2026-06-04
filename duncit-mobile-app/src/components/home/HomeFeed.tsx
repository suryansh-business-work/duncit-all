import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import { HomeSkeleton } from '@/components/Skeleton';

import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ClubSection } from '@/components/home/ClubSection';
import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeFeaturedPods } from '@/components/home/HomeFeaturedPods';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { StatusRail } from '@/components/status/StatusRail';

/** Scrollable home body — RN port of mWeb's HomePage. Owns the selected vibe
 * chip, fetches the feed, and renders the status rail, vibe chips, the
 * "Happening nearby" section, featured pods and per-club pod rows. */
export function HomeFeed() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const { isLoading, hasData, categoryChips, clubsWithPods, featuredPods, totalPods, refetch } =
    useHomeFeed(selectedCategoryId);
  const { data: meData } = useMe();
  const { primary } = useThemeColors();
  const { openPod, openClub } = useDetailNav();

  const userName = meData?.me?.first_name ?? meData?.me?.full_name ?? 'You';
  const userPhoto = meData?.me?.profile_photo;
  const isEmpty = hasData && featuredPods.length === 0 && clubsWithPods.length === 0;

  if (isLoading && !hasData) {
    return <HomeSkeleton />;
  }

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading && hasData} onRefresh={refetch} tintColor={primary} />
      }
    >
      <YStack gap={20} paddingTop={12} paddingBottom={124} testID="home-feed">
        <StatusRail userName={userName} userPhoto={userPhoto} />
        <HomeVibeChips
          categories={categoryChips}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
        <YStack gap={16}>
          <HappeningNearbyHeader totalPods={totalPods} />
          <HomeFeaturedPods
            pods={featuredPods}
            onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
          />
          {isEmpty ? (
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
          ) : (
            clubsWithPods.map(({ club, pods }) => (
              <ClubSection
                key={club.id}
                club={club}
                pods={pods}
                onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
                onOpenClub={(c) => openClub(c.id, c.club_name)}
              />
            ))
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
