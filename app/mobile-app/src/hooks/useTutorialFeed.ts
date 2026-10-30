import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { tutorialFeedVariables, type TutorialFilters } from '@duncit/utils';

import type { TutorialLanguage } from '@/generated/graphql/graphql';
import { MobileTutorialsDocument, MobileTutorialTopicsDocument } from '@/graphql/tutorials';
import { graphqlRequest } from '@/services/graphql.client';

export type TutorialItem = ResultOf<typeof MobileTutorialsDocument>['tutorials']['rows'][number];
export type TutorialTopic = ResultOf<typeof MobileTutorialTopicsDocument>['tutorialTopics'][number];

interface FeedState {
  rows: TutorialItem[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  failed: boolean;
}

const INITIAL: FeedState = { rows: [], page: 0, hasMore: false, loading: true, loadingMore: false, failed: false };

const fetchPage = (filters: TutorialFilters, page: number) => {
  const vars = tutorialFeedVariables(filters, page);
  return graphqlRequest(
    MobileTutorialsDocument,
    { ...vars, language: vars.language as TutorialLanguage | null },
    { auth: true },
  ).then((data) => data.tutorials);
};

/**
 * The Tutorials feed for one set of filters: page 1 on every filter change,
 * the next page on demand, and in-place patches for likes / watched so the
 * overlay never waits on a refetch. A stale answer (filters changed while it
 * was in flight) is dropped.
 */
export function useTutorialFeed(filters: TutorialFilters) {
  const [state, setState] = useState<FeedState>(INITIAL);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const { search, topic, language } = filters;

  useEffect(() => {
    const mine = ++generation.current;
    setState(INITIAL);
    fetchPage({ search, topic, language, focus: '' }, 1)
      .then((page) => {
        if (generation.current !== mine) return;
        setState({ rows: page.rows, page: page.page, hasMore: page.has_more, loading: false, loadingMore: false, failed: false });
      })
      .catch(() => {
        if (generation.current === mine) setState({ ...INITIAL, loading: false, failed: true });
      });
  }, [search, topic, language, attempt]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loadingMore || state.loading) return;
    const mine = generation.current;
    setState((current) => ({ ...current, loadingMore: true }));
    fetchPage({ search, topic, language, focus: '' }, state.page + 1)
      .then((page) => {
        if (generation.current !== mine) return;
        setState((current) => ({
          ...current,
          rows: [...current.rows, ...page.rows.filter((row) => !current.rows.some((have) => have.id === row.id))],
          page: page.page,
          hasMore: page.has_more,
          loadingMore: false,
        }));
      })
      .catch(() => {
        if (generation.current === mine) setState((current) => ({ ...current, loadingMore: false }));
      });
  }, [state.hasMore, state.loadingMore, state.loading, state.page, search, topic, language]);

  const patch = useCallback((id: string, next: Partial<TutorialItem>) => {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, ...next } : row)),
    }));
  }, []);

  /** Moves a tutorial's comment count by `delta` against the latest rows. */
  const bumpComments = useCallback((id: string, delta: number) => {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === id ? { ...row, comment_count: Math.max(0, row.comment_count + delta) } : row,
      ),
    }));
  }, []);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, loadMore, patch, bumpComments, retry };
}

/** The active topics for the chip row. A failed read leaves only "All". */
export function useTutorialTopics(): TutorialTopic[] {
  const [topics, setTopics] = useState<TutorialTopic[]>([]);
  useEffect(() => {
    let live = true;
    graphqlRequest(MobileTutorialTopicsDocument, {}, { auth: true })
      .then((data) => {
        if (live) setTopics(data.tutorialTopics);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return topics;
}
