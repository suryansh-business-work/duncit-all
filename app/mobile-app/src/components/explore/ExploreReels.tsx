import { useState } from 'react';
import { FlatList, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import { DetailSkeleton } from '@/components/Skeleton';
import { useExplore } from '@/hooks/useExplore';
import type { ExplorePod } from '@/stores/explore.store';
import type { RootStackParamList } from '@/navigation/types';
import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { PodCommentsSheet } from '@/components/details/pod-comments';

/** Vertical full-screen pager of pods — the Reels experience. Measures its own
 * height so each pod snaps to the viewport below the header. */
export function ExploreReels() {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [commentsPod, setCommentsPod] = useState<ExplorePod | null>(null);
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
  } = useExplore();

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  const openPod = (pod: ExplorePod) =>
    navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title });

  return (
    <YStack flex={1} onLayout={onLayout} testID="explore-reels">
      {height === 0 ? null : isLoading && !hasData ? (
        <DetailSkeleton testID="explore-loading" />
      ) : pods.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text color="$muted" textAlign="center" testID="explore-empty">
            No pods to explore yet.
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={pods}
          keyExtractor={(pod) => pod.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
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
                onToggleSave={() => toggleSave(item.id, saved)}
                onToggleLike={() => toggleLike(item.id, like)}
                onComment={() => setCommentsPod(item)}
              />
            );
          }}
        />
      )}
      {commentsPod ? (
        <PodCommentsSheet
          podId={commentsPod.id}
          open
          viewerId={viewerId}
          onClose={() => setCommentsPod(null)}
          onCountChange={(delta) => bumpComment(commentsPod.id, delta)}
        />
      ) : null}
    </YStack>
  );
}
