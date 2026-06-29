import { useState, type ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import { DetailSkeleton } from '@/components/Skeleton';
import { useExplore } from '@/hooks/useExplore';
import type { ExplorePod } from '@/stores/explore.store';
import type { RootStackParamList } from '@/navigation/types';
import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { ExploreCreateButton } from '@/components/explore/ExploreCreateButton';
import { LikesListSheet } from '@/components/explore/LikesListSheet';
import { PodCommentsSheet } from '@/components/details/pod-comments';

/** Vertical full-screen pager of pods — the Reels experience. Measures its own
 * height so each pod snaps to the viewport below the header. */
export function ExploreReels() {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
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
    isSaved,
    isSavePending,
    likeStateFor,
    commentCountFor,
    bumpComment,
    toggleSave,
    toggleLike,
    refetch,
  } = useExplore();

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
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
  if (height === 0) {
    reelsBody = null;
  } else if (isLoading && !hasData) {
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
        data={pods}
        keyExtractor={(pod) => pod.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            testID="explore-refresh"
          />
        }
        renderItem={({ item }) => {
          const like = likeStateFor(item);
          const saved = isSaved(item.id);
          return (
            <ExplorePodCard
              pod={item}
              club={clubsById.get(item.club_id)}
              width={width}
              height={height}
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

  return (
    <YStack flex={1} onLayout={onLayout} testID="explore-reels">
      {reelsBody}
      <ExploreCreateButton />
      {commentsPod ? (
        <PodCommentsSheet
          podId={commentsPod.id}
          open
          viewerId={viewerId}
          onClose={() => setCommentsPod(null)}
          onCountChange={(delta) => bumpComment(commentsPod.id, delta)}
        />
      ) : null}
      {likersPod ? (
        <LikesListSheet
          open
          userIds={likersPod.liked_user_ids}
          onClose={() => setLikersPod(null)}
        />
      ) : null}
    </YStack>
  );
}
