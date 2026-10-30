import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  ADD_LEARNING_COMMENT,
  DELETE_LEARNING_COMMENT,
  LEARNING_COMMENTS,
  type LearningComment,
  type LearningCommentsData,
} from './queries';

/** A Learnings video's comments, newest first, paged; posting and deleting own ones. */
export function useLearningComments(tutorialId: string | null) {
  const client = useApolloClient();
  const [rows, setRows] = useState<LearningComment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [addComment] = useMutation(ADD_LEARNING_COMMENT);
  const [deleteComment] = useMutation(DELETE_LEARNING_COMMENT);

  const load = useCallback(
    async (next: number) => {
      if (!tutorialId) return;
      setLoading(true);
      setFailed(false);
      try {
        const { data } = await client.query<LearningCommentsData>({
          query: LEARNING_COMMENTS,
          variables: { tutorial_id: tutorialId, page: next },
          fetchPolicy: 'network-only',
        });
        const result = data?.tutorialComments;
        setRows((current) => (next === 1 ? (result?.rows ?? []) : [...current, ...(result?.rows ?? [])]));
        setHasMore(result?.has_more ?? false);
        setPage(next);
      } catch (error) {
        logs.mWeb.warn('LearningsPage', 'loadComments', { error });
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [client, tutorialId],
  );

  useEffect(() => {
    setRows([]);
    setPage(0);
    setHasMore(false);
    load(1).catch(() => undefined);
  }, [load]);

  /** Throws when the server refuses, so the form can say so. */
  const add = useCallback(
    async (text: string) => {
      if (!tutorialId) return;
      await addComment({ variables: { tutorial_id: tutorialId, text } });
      await load(1);
    },
    [addComment, load, tutorialId],
  );

  const remove = useCallback(
    async (commentId: string) => {
      await deleteComment({ variables: { comment_id: commentId } });
      setRows((current) => current.filter((row) => row.id !== commentId));
    },
    [deleteComment],
  );

  return {
    rows,
    loading,
    failed,
    hasMore,
    loadMore: () => load(page + 1),
    retry: () => load(1),
    add,
    remove,
  };
}
