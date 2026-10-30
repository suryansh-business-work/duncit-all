import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileAddTutorialCommentDocument,
  MobileDeleteMyTutorialCommentDocument,
  MobileTutorialCommentsDocument,
} from '@/graphql/tutorials';
import { graphqlRequest } from '@/services/graphql.client';

export type TutorialCommentItem = ResultOf<
  typeof MobileTutorialCommentsDocument
>['tutorialComments']['rows'][number];

interface CommentsState {
  rows: TutorialCommentItem[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
}

const EMPTY: CommentsState = { rows: [], page: 0, hasMore: false, loading: true, failed: false };

/** One tutorial's comments, newest first, paged; add and delete keep the list in place. */
export function useTutorialComments(tutorialId: string) {
  const [state, setState] = useState<CommentsState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    async (page: number) => {
      const data = await graphqlRequest(
        MobileTutorialCommentsDocument,
        { tutorial_id: tutorialId, page },
        { auth: true },
      );
      return data.tutorialComments;
    },
    [tutorialId],
  );

  useEffect(() => {
    let live = true;
    setState(EMPTY);
    load(1)
      .then((result) => {
        if (live)
          setState({
            rows: result.rows,
            page: result.page,
            hasMore: result.has_more,
            loading: false,
            failed: false,
          });
      })
      .catch(() => {
        if (live) setState({ ...EMPTY, loading: false, failed: true });
      });
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    setState((current) => ({ ...current, loading: true }));
    try {
      const result = await load(state.page + 1);
      setState((current) => ({
        rows: [
          ...current.rows,
          ...result.rows.filter((row) => !current.rows.some((have) => have.id === row.id)),
        ],
        page: result.page,
        hasMore: result.has_more,
        loading: false,
        failed: false,
      }));
    } catch {
      setState((current) => ({ ...current, loading: false, failed: true }));
    }
  }, [load, state.hasMore, state.loading, state.page]);

  /** Throws when the server refuses, so the form can say so. */
  const add = useCallback(
    async (text: string) => {
      const data = await graphqlRequest(
        MobileAddTutorialCommentDocument,
        { tutorial_id: tutorialId, text },
        { auth: true },
      );
      setState((current) => ({ ...current, rows: [data.addTutorialComment, ...current.rows] }));
    },
    [tutorialId],
  );

  /** Throws when the server refuses; returns whether a comment was removed. */
  const remove = useCallback(async (commentId: string) => {
    const data = await graphqlRequest(
      MobileDeleteMyTutorialCommentDocument,
      { comment_id: commentId },
      { auth: true },
    );
    if (data.deleteMyTutorialComment) {
      setState((current) => ({
        ...current,
        rows: current.rows.filter((row) => row.id !== commentId),
      }));
    }
    return data.deleteMyTutorialComment;
  }, []);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, loadMore, add, remove, retry };
}
