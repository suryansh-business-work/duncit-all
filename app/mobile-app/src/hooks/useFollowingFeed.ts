import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FollowingFeedDocument } from '@/graphql/following-feed';
import { TogglePostLikeDocument } from '@/graphql/posts';
import { FollowingFeedSource } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export type FeedPost = ResultOf<typeof FollowingFeedDocument>['followingFeed'][number];
export type FeedSource = 'PEOPLE' | 'CLUBS';

const SOURCE_ENUM: Record<FeedSource, FollowingFeedSource> = {
  PEOPLE: FollowingFeedSource.People,
  CLUBS: FollowingFeedSource.Clubs,
};

/**
 * One Following-feed tab (PEOPLE or CLUBS): fetches on mount/source change and
 * exposes an optimistic like toggle that reverts on failure. RN twin of the
 * mWeb Following feed's Apollo query + togglePostLike.
 */
export function useFollowingFeed(source: FeedSource) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await graphqlRequest(
        FollowingFeedDocument,
        { source: SOURCE_ENUM[source] },
        { auth: true },
      );
      setPosts(data.followingFeed);
      setError(undefined);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [source]);

  useEffect(() => {
    // fetch never rejects (errors are captured into state), so no catch needed.
    void fetch();
  }, [fetch]);

  const applyLike = (id: string, liked: boolean, count: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked_by_me: liked, likes_count: count } : p)),
    );
  };

  const toggleLike = async (post: FeedPost) => {
    const nextLiked = !post.liked_by_me;
    applyLike(post.id, nextLiked, post.likes_count + (nextLiked ? 1 : -1));
    try {
      const data = await graphqlRequest(TogglePostLikeDocument, { id: post.id }, { auth: true });
      applyLike(post.id, data.togglePostLike.liked_by_me, data.togglePostLike.likes_count);
    } catch {
      applyLike(post.id, post.liked_by_me, post.likes_count);
    }
  };

  return { posts, isLoading, error, refetch: fetch, toggleLike };
}
