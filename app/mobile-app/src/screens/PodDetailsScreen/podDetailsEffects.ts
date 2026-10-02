import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { PodDetail } from '@/hooks/useDetails';
import { useExploreStore } from '@/stores/explore.store';

/** Mirror like changes to the Explore feed banner so the two stay in sync
 * (bug 16). Skip the first settled render so we only push real user actions. */
export function useMirrorLikeToExplore(pod: PodDetail | null, liked: boolean, likeCount: number) {
  const didMirrorLike = useRef(false);
  useEffect(() => {
    if (!pod) return;
    if (!didMirrorLike.current) {
      didMirrorLike.current = true;
      return;
    }
    useExploreStore.getState().setLike(pod.id, { liked_by_me: liked, like_count: likeCount });
  }, [pod, liked, likeCount]);
}

/** Re-pull membership when the screen regains focus (e.g. after a successful
 * checkout) so the bar flips to "Pod Booked" without a manual reload. The hook
 * already fetched on mount, so skip the first focus. */
export function useRefetchOnFocus(refetch: () => Promise<void>) {
  const didFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didFocus.current) {
        didFocus.current = true;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
