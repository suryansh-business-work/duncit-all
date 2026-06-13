import { useEffect, useState } from 'react';

import {
  FollowClubDocument,
  FollowPodDocument,
  UnfollowClubDocument,
  UnfollowPodDocument,
} from '@/graphql/following';
import { graphqlRequest } from '@/services/graphql.client';

/** Optimistic follow toggle shared by pod + club details (and any future
 * entity). `follow`/`unfollow` resolve to the next following state. */
export function useFollow(
  initial: boolean,
  follow: () => Promise<boolean>,
  unfollow: () => Promise<boolean>,
) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFollowing(initial);
  }, [initial]);

  const toggle = async () => {
    if (busy) return;
    const prev = following;
    setFollowing(!prev);
    setBusy(true);
    try {
      setFollowing(prev ? await unfollow() : await follow());
    } catch {
      setFollowing(prev);
    } finally {
      setBusy(false);
    }
  };

  return { following, busy, toggle };
}

/** Follow/unfollow a pod, keeping the button in sync with the server's list. */
export function usePodFollow(podId: string, initial: boolean) {
  return useFollow(
    initial,
    async () => {
      const res = await graphqlRequest(FollowPodDocument, { podId }, { auth: true });
      return res.followPod.following_pod_ids.includes(podId);
    },
    async () => {
      const res = await graphqlRequest(UnfollowPodDocument, { podId }, { auth: true });
      return res.unfollowPod.following_pod_ids.includes(podId);
    },
  );
}

/** Follow/unfollow a club, keeping the button in sync with the server's list. */
export function useClubFollow(clubId: string, initial: boolean) {
  return useFollow(
    initial,
    async () => {
      const res = await graphqlRequest(FollowClubDocument, { clubId }, { auth: true });
      return res.followClub.following_club_ids.includes(clubId);
    },
    async () => {
      const res = await graphqlRequest(UnfollowClubDocument, { clubId }, { auth: true });
      return res.unfollowClub.following_club_ids.includes(clubId);
    },
  );
}
