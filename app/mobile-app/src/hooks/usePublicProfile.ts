import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobilePublicProfileDocument,
  MobilePublicUserPostsDocument,
  MobileUserBadgesDocument,
} from '@/graphql/public-profile';
import { graphqlRequest } from '@/services/graphql.client';
import { MobileFollowUserDocument, MobileUnfollowUserDocument } from '@/graphql/hosts-venues';

type ProfileData = ResultOf<typeof MobilePublicProfileDocument>;
export type PublicProfileUser = NonNullable<ProfileData['publicUserProfile']>;
export type UserBadge = ResultOf<typeof MobileUserBadgesDocument>['userBadges'][number];
type PostsData = ResultOf<typeof MobilePublicUserPostsDocument>;
export type PublicProfilePost = PostsData['posts'][number];

/** A user's public profile + badges + posts/stories + whether the viewer owns
 * it. Private accounts hide posts/stories from non-followers (canView=false). */
export function usePublicProfile(userId: string) {
  const [user, setUser] = useState<PublicProfileUser | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [following, setFollowing] = useState(false);
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
        setFollowing((d.me?.following_user_ids ?? []).includes(userId));
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

  // Follow/unfollow this member (B4-12) — optimistic, reverts on failure. A
  // successful toggle re-pulls posts so a now-visible private feed appears.
  const toggleFollow = async () => {
    if (followBusy) return;
    const prev = following;
    setFollowing(!prev);
    setFollowBusy(true);
    try {
      if (prev) {
        const res = await graphqlRequest(
          MobileUnfollowUserDocument,
          { user_id: userId },
          { auth: true },
        );
        setFollowing((res.unfollowUser.following_user_ids ?? []).includes(userId));
      } else {
        const res = await graphqlRequest(
          MobileFollowUserDocument,
          { user_id: userId },
          { auth: true },
        );
        setFollowing((res.followUser.following_user_ids ?? []).includes(userId));
      }
      if (!isOwner && user?.is_private) {
        setCanView(!prev);
        await loadPosts();
      }
    } catch {
      setFollowing(prev);
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
    following,
    followBusy,
    toggleFollow,
    isLoading,
    error,
  };
}
