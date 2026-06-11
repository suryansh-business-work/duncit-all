import { useEffect, useMemo } from 'react';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
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
  const savePending = useExploreStore((s) => s.savePending);
  const likeOverride = useExploreStore((s) => s.likeOverride);
  const commentDelta = useExploreStore((s) => s.commentDelta);
  const fetch = useExploreStore((s) => s.fetch);
  const toggleSave = useExploreStore((s) => s.toggleSave);
  const toggleLike = useExploreStore((s) => s.toggleLike);
  const bumpComment = useExploreStore((s) => s.bumpComment);
  const { selectedSuperId } = useSuperCategories();
  const { selectedId: selectedLocationId } = useLocations();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const clubsById = useMemo(() => {
    const map = new Map<string, ExploreClub>();
    (data?.clubs ?? []).forEach((club) => map.set(club.id, club));
    return map;
  }, [data?.clubs]);

  const pods = useMemo(() => {
    return (data?.pods ?? []).filter((p) => {
      if (selectedSuperId && clubsById.get(p.club_id)?.super_category_id !== selectedSuperId) {
        return false;
      }
      // Virtual pods are location-independent — they show under the Super Category
      // regardless of the selected city (bug: hidden by the location filter).
      const isVirtual = p.pod_mode === 'VIRTUAL';
      if (selectedLocationId && !isVirtual && p.location_id !== selectedLocationId) return false;
      return true;
    });
  }, [data?.pods, clubsById, selectedSuperId, selectedLocationId]);

  const serverSaved = useMemo(
    () => new Set(data?.me?.saved_pod_ids ?? []),
    [data?.me?.saved_pod_ids],
  );

  const isSaved = (podId: string) => savedOverride[podId] ?? serverSaved.has(podId);
  const isSavePending = (podId: string) => !!savePending[podId];

  const likeStateFor = (pod: ExplorePod): LikeState =>
    likeOverride[pod.id] ?? { liked_by_me: pod.liked_by_me, like_count: pod.like_count };

  const commentCountFor = (pod: ExplorePod): number =>
    pod.comment_count + (commentDelta[pod.id] ?? 0);

  return {
    pods,
    clubsById,
    isLoading,
    hasData: !!data,
    viewerId: data?.me?.user_id ?? null,
    isSaved,
    isSavePending,
    likeStateFor,
    commentCountFor,
    bumpComment,
    toggleSave,
    toggleLike,
    refetch: () => fetch(true),
  };
}
