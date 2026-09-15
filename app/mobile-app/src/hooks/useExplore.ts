import { useCallback, useEffect, useMemo } from 'react';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import {
  useExploreStore,
  type ExploreClub,
  type ExplorePod,
  type LikeState,
} from '@/stores/explore.store';
import { useRefreshRegistration } from '@/components/PullToRefresh';

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

  // The city is a server filter (the pod's city, a venue in it, or a virtual
  // pod), so another city's reels never reach the feed; picking a city refetches.
  useEffect(() => {
    fetch(selectedLocationId);
  }, [fetch, selectedLocationId]);

  const clubsById = useMemo(() => {
    const map = new Map<string, ExploreClub>();
    (data?.clubs ?? []).forEach((club) => map.set(club.id, club));
    return map;
  }, [data?.clubs]);

  const pods = useMemo(() => {
    return (data?.pods ?? []).filter((p) => {
      // Explore is reel-only: the server filters on has_reel, but guard against
      // stale caches / older servers so a card never renders without a video.
      if (!p.reel_url) return false;
      return !selectedSuperId || clubsById.get(p.club_id)?.super_category_id === selectedSuperId;
    });
  }, [data?.pods, clubsById, selectedSuperId]);

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
  // Stable, for the same reason `useSupport.reload` is: a fresh arrow every
  // render becomes a changing dependency in a caller's effect, and an effect
  // that refetches then loops. See the ~35,000-request incident in useSupport.

  const refetch = useCallback(() => fetch(selectedLocationId, true), [fetch, selectedLocationId]);

  useRefreshRegistration(refetch);

  return {
    pods,
    clubsById,
    isLoading,
    hasData: !!data,
    viewerId: data?.me?.user_id ?? null,
    viewerPhoto: data?.me?.profile_photo ?? null,
    isSaved,
    isSavePending,
    likeStateFor,
    commentCountFor,
    bumpComment,
    toggleSave,
    toggleLike,
    refetch,
  };
}
