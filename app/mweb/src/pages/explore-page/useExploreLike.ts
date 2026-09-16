import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { TOGGLE_POD_LIKE } from '../pod-details-page/queries';

/** A reel's like state: optimistic on tap, reconciled with the server's answer,
 * and rolled back if the toggle fails. */
export function useExploreLike(pod: any) {
  const [liked, setLiked] = useState<boolean>(!!pod.liked_by_me);
  const [likeCount, setLikeCount] = useState<number>(pod.like_count ?? 0);
  const [toggleLike] = useMutation<any>(TOGGLE_POD_LIKE);

  // Re-sync to the latest server values when the feed refetches (e.g. after the
  // user liked on the Pod Detail page) so the banner stays in sync.
  useEffect(() => {
    setLiked(!!pod.liked_by_me);
    setLikeCount(pod.like_count ?? 0);
  }, [pod.liked_by_me, pod.like_count]);

  const onLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await toggleLike({ variables: { id: pod.id } });
      setLiked(!!res.data?.togglePodLike?.liked_by_me);
      setLikeCount(res.data?.togglePodLike?.like_count ?? likeCount);
    } catch {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
    }
  };

  return { liked, likeCount, onLike };
}
