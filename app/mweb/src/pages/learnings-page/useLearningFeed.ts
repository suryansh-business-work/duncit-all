import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { tutorialFeedVariables, withFocusedFirst, type TutorialFilters } from '@duncit/utils';
import { LEARNINGS_FEED, type LearningCard, type LearningsFeedData } from './queries';

type Patch = Partial<Pick<LearningCard, 'liked_by_me' | 'like_count' | 'watched_by_me' | 'comment_count'>>;

/**
 * The Learnings feed for the current filters: page 1 through Apollo, every
 * later page appended locally as the viewer swipes near the end. `patch`
 * overlays a card's like / watched / comment counts after an action, so the
 * card updates without refetching the whole feed.
 */
export function useLearningFeed(filters: TutorialFilters) {
  const client = useApolloClient();
  const variables = useMemo(() => tutorialFeedVariables(filters, 1), [filters]);
  const first = useQuery<LearningsFeedData>(LEARNINGS_FEED, { variables, fetchPolicy: 'cache-and-network' });
  const [more, setMore] = useState<LearningCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [patches, setPatches] = useState<Record<string, Patch>>({});

  // A new filter starts the feed over.
  useEffect(() => {
    setMore([]);
    setPage(1);
  }, [variables]);
  useEffect(() => {
    if (page === 1) setHasMore(first.data?.tutorials.has_more ?? false);
  }, [first.data, page]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { data } = await client.query<LearningsFeedData>({
        query: LEARNINGS_FEED,
        variables: tutorialFeedVariables(filters, next),
        fetchPolicy: 'network-only',
      });
      setMore((rows) => [...rows, ...(data?.tutorials.rows ?? [])]);
      setHasMore(data?.tutorials.has_more ?? false);
      setPage(next);
    } catch (error) {
      logs.mWeb.warn('LearningsPage', 'loadMore', { error });
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [client, filters, hasMore, loadingMore, page]);

  const patch = useCallback((id: string, change: Patch) => {
    setPatches((all) => ({ ...all, [id]: { ...all[id], ...change } }));
  }, []);

  const rows = useMemo(() => {
    const merged = [...(first.data?.tutorials.rows ?? []), ...more];
    const seen = new Set<string>();
    const unique = merged.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
    return withFocusedFirst(unique, filters.focus).map((row) => ({ ...row, ...patches[row.id] }));
  }, [first.data, more, patches, filters.focus]);

  return {
    rows,
    loading: first.loading && !first.data,
    error: first.error,
    refetch: () => first.refetch(),
    hasMore,
    loadingMore,
    loadMore,
    patch,
  };
}
