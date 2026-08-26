import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobilePublicProfileDocument,
  MobilePublicUserPostsDocument,
  MobileUserBadgesDocument,
} from '@/graphql/public-profile';
import {
  MobileAcceptFollowRequestDocument,
  MobileRejectFollowRequestDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { runUserFollowAction } from '@/services/follow-user';
import {
  followActionFor,
  nextFollowStatus,
  readFollowStatus,
  type FollowStatus,
} from '@duncit/utils';

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
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [followBusy, setFollowBusy] = useState(false);
  const [answerBusy, setAnswerBusy] = useState(false);
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

  // The server is the authority on both directions of the relationship, so
  // anything that changes it re-reads the profile rather than patching state.
  const loadProfile = useCallback(async () => {
    const d = await graphqlRequest(
      MobilePublicProfileDocument,
      { user_id: userId },
      { auth: true },
    );
    const profile = d.publicUserProfile ?? null;
    const owner = !!d.me?.user_id && d.me.user_id === profile?.user_id;
    setUser(profile);
    setIsOwner(owner);
    setFollowStatus(profile ? readFollowStatus(profile) : 'NONE');
    setCanView(owner || profile?.can_view_content !== false);
  }, [userId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadProfile(),
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
  }, [userId, loadProfile, loadPosts]);

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
      const settled = await runUserFollowAction(followActionFor(prev), userId);
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

  // Accept / Deny this person's open ask to follow the viewer — the same
  // FollowRequest the inbox row answers, reached from the relationship itself.
  const answerRequest = async (accept: boolean) => {
    const requestId = user?.inbound_request_id;
    if (!requestId || answerBusy) return;
    setAnswerBusy(true);
    try {
      await graphqlRequest(
        accept ? MobileAcceptFollowRequestDocument : MobileRejectFollowRequestDocument,
        { request_id: requestId },
        { auth: true },
      );
      await loadProfile();
    } catch {
      // The profile keeps offering the answer, so the viewer can simply retry.
    } finally {
      setAnswerBusy(false);
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
    followsViewer: !!user?.follows_viewer,
    inboundRequestId: user?.inbound_request_id ?? null,
    answerBusy,
    toggleFollow,
    answerRequest,
    isLoading,
    error,
  };
}
