import { useEffect, useMemo } from 'react';

import { useHomeData } from '@/hooks/useHomeFeed';
import { useFollowingStore } from '@/stores/following.store';

/** Loads the user's followed ids and returns the followed pods (intersected with
 * the home feed). Followed people/posts are a follow-up. */
export function useFollowing() {
  const data = useFollowingStore((s) => s.data);
  const isLoading = useFollowingStore((s) => s.isLoading);
  const fetch = useFollowingStore((s) => s.fetch);
  const home = useHomeData();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const followedPodIds = useMemo(
    () => new Set(data?.me?.following_pod_ids ?? []),
    [data?.me?.following_pod_ids],
  );

  const followedPods = useMemo(
    () => home.pods.filter((pod) => followedPodIds.has(pod.id)),
    [home.pods, followedPodIds],
  );

  return {
    isLoading: isLoading || home.isLoading,
    hasData: !!data && home.hasData,
    followedPods,
    refetch: () => {
      void fetch(true);
      home.refetch();
    },
  };
}
