import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobilePublicProfileDocument,
  MobilePublicUserPostsDocument,
  MobileUserBadgesDocument,
} from '@/graphql/public-profile';
import { graphqlRequest } from '@/services/graphql.client';
import {
  MobileCancelFollowRequestDocument,
  MobileFollowUserDocument,
  MobileUnfollowUserDocument,
} from '@/graphql/hosts-venues';
import {
  followActionFor,
  nextFollowStatus,
  readFollowStatus,
  type FollowAction,
  type FollowStatus,
} from '@duncit/utils';

type ProfileData = ResultOf<typeof MobilePublicProfileDocument>;
export type PublicProfileUser = NonNullable<ProfileData['publicUserProfile']>;
export type UserBadge = ResultOf<typeof MobileUserBadgesDocument>['userBadges'][number];
type PostsData = ResultOf<typeof MobilePublicUserPostsDocument>;
export type PublicProfilePost = PostsData['posts'][number];

/**
 * Run one follow action and report the status the SERVER settled on.
 *
 * Following a private profile returns REQUESTED, not FOLLOWING — the follow
 * edge is only written when its owner accepts, so the button must believe the
 * response rather than the tap.
 */
async function runFollowAction(
  action: FollowAction,
  userId: string,
  isPrivate: boolean,
): Promise<FollowStatus> {
  if (action === 'UNFOLLOW') {
    const res = await graphqlRequest(
      MobileUnfollowUserDocument,
      { user_id: userId },
      { auth: true },
    );
    return (res.unfollowUser.following_user_ids ?? []).includes(userId) ? 'FOLLOWING' : 'NONE';
  }
  if (action === 'CANCEL_REQUEST') {
    const res = await graphqlRequest(
      MobileCancelFollowRequestDocument,
      { user_id: userId },
      { auth: true },
    );
    return (res.cancelFollowRequest.requested_user_ids ?? []).includes(userId)
      ? 'REQUESTED'
      : 'NONE';
  }
  const res = await graphqlRequest(MobileFollowUserDocument, { user_id: userId }, { auth: true });
  if ((res.followUser.following_user_ids ?? []).includes(userId)) return 'FOLLOWING';
  // No edge came back. On a private profile that is the expected answer — the
  // ask is pending. On a public one it means the follow simply did not land.
  return isPrivate ? 'REQUESTED' : 'NONE';
}

/** A user's public profile + badges + posts/stories + whether the viewer owns
 * it. Private accounts hide posts/stories from non-followers (canView=false). */
export function usePublicProfile(userId: string) {
  const [user, setUser] = useState<PublicProfileUser | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [followBusy, setFollowBusy] = useState(false);
  const [canView, setCanView] = useState(true);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [posts, setPosts] = useState<PublicProfilePost[]>([]);
  const [stories, setStories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const loadPosts = useCallback(async () => {
    const data = await graphqlRequest(
      MobilePublicUserPostsDocument,
      { user_id: userId },
      { auth: true },
    ).catch(() => null);
    setPosts(data?.posts ?? []);
    setStories((data?.stories ?? []).map((story) => story.image_url));
  }, [userId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      graphqlRequest(MobilePublicProfileDocument, { user_id: userId }, { auth: true }).then((d) => {
        if (!active) return;
        const profile = d.publicUserProfile ?? null;
        const owner = !!d.me?.user_id && d.me.user_id === profile?.user_id;
        setUser(profile);
        setIsOwner(owner);
        setFollowStatus(profile ? readFollowStatus(profile) : 'NONE');
        setCanView(owner || profile?.can_view_content !== false);
      }),
      graphqlRequest(MobileUserBadgesDocument, { user_id: userId }, { auth: true })
        .then((d) => active && setBadges(d.userBadges))
        .catch(() => undefined),
      loadPosts(),
    ])
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [userId, loadPosts]);

  // Follow / Requested / Following — optimistic, reverts on failure.
  //
  // A private profile answers a follow with a REQUEST, so this must not reveal
  // the feed: `canView` only opens when the server confirms an actual follow
  // edge. Opening it on the tap was the visible half of the bug — the account
  // looked followed and its posts appeared while the owner had approved nothing.
  const toggleFollow = async () => {
    if (followBusy) return;
    const prev = followStatus;
    const isPrivate = !!user?.is_private;
    setFollowStatus(nextFollowStatus(prev, isPrivate));
    setFollowBusy(true);
    try {
      const settled = await runFollowAction(followActionFor(prev), userId, isPrivate);
      setFollowStatus(settled);
      // A private feed opens only on a confirmed edge, never on the tap.
      if (!isOwner && isPrivate) {
        setCanView(settled === 'FOLLOWING');
        if (settled === 'FOLLOWING') await loadPosts();
      }
    } catch {
      setFollowStatus(prev);
    } finally {
      setFollowBusy(false);
    }
  };

  return {
    user,
    isOwner,
    badges,
    posts,
    stories,
    canView,
    followStatus,
    followBusy,
    toggleFollow,
    isLoading,
    error,
  };
}
