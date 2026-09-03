import { useCallback, useEffect, useRef, useState } from 'react';

/** One page of a server-side table, as every `<entity>Table` query answers it. */
export interface TablePage<Row> {
  rows: Row[];
  total: number;
}

export interface TablePageState<Row> {
  rows: Row[];
  total: number;
  /** The first page is in flight — nothing is on screen yet. */
  isLoading: boolean;
  /** A further page is being appended under the rows already shown. */
  isLoadingMore: boolean;
  hasError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * A "load more" list over a paged table query.
 *
 * `fetcher(page)` asks for ONE page (1-based, the way the server's table engine
 * counts) and the hook appends it under the pages already shown; a new
 * `fetcher` identity — a changed filter or search — starts again from page
 * one. Responses are sequenced so a slow page from a previous filter can never
 * land on top of the current list.
 */
export function useTablePage<Row>(
  fetcher: (page: number) => Promise<TablePage<Row>>,
): TablePageState<Row> {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const seq = useRef(0);

  const load = useCallback(
    (nextPage: number) => {
      seq.current += 1;
      const id = seq.current;
      const append = nextPage > 1;
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setHasError(false);
      fetcher(nextPage)
        .then((result) => {
          if (id !== seq.current) return;
          setRows((current) => (append ? [...current, ...result.rows] : result.rows));
          setTotal(result.total);
          setPage(nextPage);
        })
        .catch(() => {
          if (id === seq.current) setHasError(true);
        })
        .finally(() => {
          if (id !== seq.current) return;
          setIsLoading(false);
          setIsLoadingMore(false);
        });
    },
    [fetcher],
  );

  useEffect(() => {
    load(1);
    return () => {
      // Anything still in flight answers for a fetcher that no longer applies.
      seq.current += 1;
    };
  }, [load]);

  return {
    rows,
    total,
    isLoading,
    isLoadingMore,
    hasError,
    hasMore: rows.length < total,
    loadMore: () => load(page + 1),
    refetch: () => load(1),
  };
}
