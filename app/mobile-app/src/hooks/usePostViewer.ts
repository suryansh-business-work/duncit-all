import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  AddPostCommentDocument,
  DeletePostCommentDocument,
  DeletePostDocument,
  PostDetailsDocument,
  TogglePostLikeDocument,
} from '@/graphql/posts';
import { graphqlRequest } from '@/services/graphql.client';

type PostDetailsData = ResultOf<typeof PostDetailsDocument>;
export type PostDetail = NonNullable<PostDetailsData['post']>;
export type PostComment = PostDetail['comments'][number];

/**
 * The profile post viewer's data (auth): loads a post with its comment thread
 * and exposes like / comment / delete actions that reload it — the RN twin of
 * mWeb's PostDialog data layer.
 */
export function usePostViewer(id: string) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await graphqlRequest(PostDetailsDocument, { id }, { auth: true });
    setPost(data.post ?? null);
  }, [id]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  const runAndReload = useCallback(
    async (run: () => Promise<unknown>) => {
      await run();
      await load();
    },
    [load],
  );

  const toggleLike = () =>
    runAndReload(() => graphqlRequest(TogglePostLikeDocument, { id }, { auth: true }));

  const addComment = (text: string) =>
    runAndReload(() =>
      graphqlRequest(AddPostCommentDocument, { id, text: text.trim() }, { auth: true }),
    );

  const deleteComment = (commentId: string) =>
    runAndReload(() =>
      graphqlRequest(DeletePostCommentDocument, { id, commentId }, { auth: true }),
    );

  /** Deletes the post itself (owner only) — no reload, the viewer closes. */
  const deletePost = async () => {
    await graphqlRequest(DeletePostDocument, { id }, { auth: true });
  };

  return { post, isLoading, toggleLike, addComment, deleteComment, deletePost };
}
