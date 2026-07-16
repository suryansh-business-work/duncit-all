import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import { DetailSkeleton } from '@/components/Skeleton';
import { ExploreAdCard } from '@/components/ads/ExploreAdCard';
import { interleaveAds, isAdEntry } from '@/components/ads/interleaveAds';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useExplore } from '@/hooks/useExplore';
import { likersWithViewer } from '@/utils/explore-likers';
import type { ExplorePod } from '@/stores/explore.store';
import type { RootStackParamList } from '@/navigation/types';
import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { LikesListSheet } from '@/components/explore/LikesListSheet';
import { PodCommentsSheet } from '@/components/details/pod-comments';

/** Vertical full-screen pager of pods — the Reels experience. Measures its own
 * height so each pod snaps to the viewport below the header. */
export function ExploreReels() {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  // Only the visible reel plays its video — the others stay paused.
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsPod, setCommentsPod] = useState<ExplorePod | null>(null);
  const [likersPod, setLikersPod] = useState<ExplorePod | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    pods,
    clubsById,
    isLoading,
    hasData,
    viewerId,
    viewerPhoto,
    isSaved,
    isSavePending,
    likeStateFor,
    commentCountFor,
    bumpComment,
    toggleSave,
    toggleLike,
    refetch,
  } = useExplore();
  // Sponsored reels woven into the feed — one full-screen ad every 5 pods.
  const { ads } = useActiveAds('EXPLORE_SCROLL');
  const feed = useMemo(() => interleaveAds(pods, ads, 5), [pods, ads]);

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  // FlatList requires a stable identity for the viewability pair across renders.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (index != null) setActiveIndex(index);
  }).current;
  const openPod = (pod: ExplorePod) =>
    navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title });
  const openClub = (pod: ExplorePod) =>
    navigation.navigate('ClubDetails', {
      clubId: pod.club_id,
      title: clubsById.get(pod.club_id)?.club_name ?? 'Club',
    });
  // Pull-to-refresh: reload the feed without duplicate entries (item 12).
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  let reelsBody: ReactNode = null;
  if (height > 0) {
    if (isLoading && !hasData) {
      reelsBody = <DetailSkeleton testID="explore-loading" />;
    } else if (pods.length === 0) {
      reelsBody = (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text color="$muted" textAlign="center" testID="explore-empty">
            No pods to explore yet.
          </Text>
        </YStack>
      );
    } else {
      reelsBody = (
        <FlatList
          data={feed}
          keyExtractor={(entry) => (isAdEntry(entry) ? entry.key : entry.item.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          // Full-screen items: keep only the current reel ±2 mounted (default
          // windowSize 21 = ~21 full-screen image cards alive → heavy memory/GC).
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              testID="explore-refresh"
            />
          }
          renderItem={({ item: entry, index }) => {
            if (isAdEntry(entry)) {
              return (
                <ExploreAdCard
                  ad={entry.ad}
                  width={width}
                  height={height}
                  isActive={index === activeIndex}
                />
              );
            }
            const item = entry.item;
            const like = likeStateFor(item);
            const saved = isSaved(item.id);
            return (
              <ExplorePodCard
                pod={item}
                club={clubsById.get(item.club_id)}
                width={width}
                height={height}
                isActive={index === activeIndex}
                saved={saved}
                savePending={isSavePending(item.id)}
                like={like}
                commentCount={commentCountFor(item)}
                onOpen={() => openPod(item)}
                onOpenClub={() => openClub(item)}
                onToggleSave={() => toggleSave(item.id, saved)}
                onToggleLike={() => toggleLike(item.id, like)}
                onComment={() => setCommentsPod(item)}
                onShowLikers={() => setLikersPod(item)}
              />
            );
          }}
        />
      );
    }
  }

  return (
    <YStack flex={1} onLayout={onLayout} testID="explore-reels">
      {reelsBody}
      {commentsPod ? (
        <PodCommentsSheet
          podId={commentsPod.id}
          open
          viewerId={viewerId}
          viewerPhoto={viewerPhoto}
          onClose={() => setCommentsPod(null)}
          onCountChange={(delta) => bumpComment(commentsPod.id, delta)}
        />
      ) : null}
      {likersPod ? (
        <LikesListSheet
          open
          userIds={likersWithViewer(
            likersPod.liked_user_ids,
            viewerId,
            likeStateFor(likersPod).liked_by_me,
          )}
          onClose={() => setLikersPod(null)}
        />
      ) : null}
    </YStack>
  );
}
