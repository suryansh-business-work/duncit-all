import { useCallback, useEffect, useRef, useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { errorMessage } from '@/utils/errors';

export const PAGE_SIZE = 25;
/** Wait for typing to pause before asking the server. */
export const SEARCH_DEBOUNCE_MS = 350;

export interface Page<Row> {
  rows: readonly Row[];
  total: number;
}

/**
 * A server list, searched and read page by page (the portal tables' paging on
 * the phone). `fetchPage` is re-run from page 1 whenever it changes — memoise
 * it on its inputs — and a newer search always wins: an answer to an older one
 * is dropped.
 */
export function usePagedSearch<Row>(
  fetchPage: (page: number, pageSize: number) => Promise<Page<Row>>,
  options: { fallbackError: string; scope: string },
) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const { fallbackError, scope } = options;

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++request.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(nextPage, PAGE_SIZE);
        if (id !== request.current) return;
        setRows((current) => (nextPage === 1 ? [...result.rows] : [...current, ...result.rows]));
        setTotal(result.total);
        setPage(nextPage);
      } catch (err) {
        if (id === request.current) setError(errorMessage(err, fallbackError));
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [fetchPage, fallbackError],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => fireAndForget(load(1), logs.mobileApp, scope, 'load'),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [load, scope]);

  const hasMore = rows.length < total;
  const loadMore = useCallback(() => {
    if (!loading && hasMore) fireAndForget(load(page + 1), logs.mobileApp, scope, 'load');
  }, [loading, hasMore, load, page, scope]);

  const refresh = useCallback(() => load(1), [load]);
  return { rows, total, loading, error, hasMore, loadMore, refresh };
}
