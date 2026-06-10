import { useWindowDimensions } from 'react-native';

import { FeedList } from '@/components/FeedList';
import { PodCard } from '@/components/home/PodCard';
import { TabScreen } from '@/components/TabScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useFollowing } from '@/hooks/useFollowing';

/** Following tab — pods the user follows. */
export function FollowingScreen() {
  const { followedPods, isLoading, refetch } = useFollowing();
  const { openPod } = useDetailNav();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 520);

  return (
    <TabScreen testID="following-screen">
      <FeedList
        testID="following-list"
        isLoading={isLoading}
        isEmpty={followedPods.length === 0}
        emptyText="You're not following any pods yet. Follow a pod to see it here."
        onRefresh={refetch}
      >
        {followedPods.map((pod) => (
          <PodCard
            key={pod.id}
            pod={pod}
            width={cardWidth}
            onPress={() => openPod(pod.id, pod.pod_title)}
          />
        ))}
      </FeedList>
    </TabScreen>
  );
}
