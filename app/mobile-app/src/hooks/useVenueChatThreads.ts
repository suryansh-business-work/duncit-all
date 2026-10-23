import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { VENUE_CHAT_THREADS_PAGE } from '@duncit/utils';

import { MyVenueChatThreadsDocument } from '@/graphql/venue-chat';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';

export type VenueChatThreadItem = ResultOf<
  typeof MyVenueChatThreadsDocument
>['myVenueChatThreads']['rows'][number];

const fetchPage = async (venueId: string, offset: number) =>
  (
    await graphqlRequest(
      MyVenueChatThreadsDocument,
      { venueId, limit: VENUE_CHAT_THREADS_PAGE, offset },
      { auth: true },
    )
  ).myVenueChatThreads;

/**
 * One venue's chat inbox — newest activity first, a page at a time. mWeb twin:
 * pages/venue-chats-page. Pull-to-refresh reloads the first page.
 */
export function useVenueChatThreads(venueId: string | null) {
  const [rows, setRows] = useState<VenueChatThreadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (!venueId) return;
    setFailed(false);
    const page = await fetchPage(venueId, 0);
    setRows(page.rows);
    setTotal(page.total);
  }, [venueId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: !!venueId,
    onError: () => setFailed(true),
  });

  const loadMore = useCallback(async () => {
    if (!venueId || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(venueId, rows.length);
      setRows((current) => [...current, ...page.rows]);
      setTotal(page.total);
    } catch (error) {
      console.warn('[useVenueChatThreads] load more failed', error);
    } finally {
      setLoadingMore(false);
    }
  }, [venueId, loadingMore, rows.length]);

  return { rows, total, isLoading, failed, loadingMore, refetch, loadMore };
}
