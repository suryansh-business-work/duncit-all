import { useEffect, useMemo } from 'react';

import {
  useExploreStore,
  type ExploreClub,
  type ExplorePod,
  type LikeState,
} from '@/stores/explore.store';

/** Loads the Explore reels feed and exposes the per-pod saved/like state with
 * the optimistic overrides already merged. */
export function useExplore() {
  const data = useExploreStore((s) => s.data);
  const isLoading = useExploreStore((s) => s.isLoading);
  const savedOverride = useExploreStore((s) => s.savedOverride);
  const likeOverride = useExploreStore((s) => s.likeOverride);
  const fetch = useExploreStore((s) => s.fetch);
  const toggleSave = useExploreStore((s) => s.toggleSave);
  const toggleLike = useExploreStore((s) => s.toggleLike);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const clubsById = useMemo(() => {
    const map = new Map<string, ExploreClub>();
    (data?.clubs ?? []).forEach((club) => map.set(club.id, club));
    return map;
  }, [data?.clubs]);

  const serverSaved = useMemo(
    () => new Set(data?.me?.saved_pod_ids ?? []),
    [data?.me?.saved_pod_ids],
  );

  const isSaved = (podId: string) => savedOverride[podId] ?? serverSaved.has(podId);

  const likeStateFor = (pod: ExplorePod): LikeState =>
    likeOverride[pod.id] ?? { liked_by_me: pod.liked_by_me, like_count: pod.like_count };

  return {
    pods: data?.pods ?? [],
    clubsById,
    isLoading,
    hasData: !!data,
    isSaved,
    likeStateFor,
    toggleSave,
    toggleLike,
    refetch: () => fetch(true),
  };
}
