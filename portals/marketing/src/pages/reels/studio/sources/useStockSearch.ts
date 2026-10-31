import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { REEL_MEDIA_SEARCH } from '../../queries';
import type { ReelAspect, ReelStockItem, ReelStockPage } from '../../types';

export type StockKind = 'IMAGE' | 'VIDEO';

interface Search {
  query: string;
  kind: StockKind;
  page: number;
}

/**
 * A stock search, one page at a time, with every page kept so "More" extends
 * the grid rather than replacing it.
 *
 * The orientation follows the reel's aspect — a portrait reel wants portrait
 * footage — and a change of aspect starts the search over: the pages already
 * shown were the wrong shape.
 */
export function useStockSearch(aspect: ReelAspect) {
  const [search, setSearch] = useState<Search | null>(null);
  const [pages, setPages] = useState<Record<number, ReelStockItem[]>>({});

  useEffect(() => {
    setSearch(null);
    setPages({});
  }, [aspect]);

  const { data, loading, error } = useQuery<{ reelMediaSearch: ReelStockPage }>(REEL_MEDIA_SEARCH, {
    variables: { query: search?.query ?? '', kind: search?.kind ?? 'VIDEO', orientation: aspect, page: search?.page ?? 1 },
    skip: search === null,
    fetchPolicy: 'network-only',
  });

  // A page is kept the first time it answers; a re-render handing the same answer again changes nothing.
  useEffect(() => {
    if (!data || !search) return;
    const { page } = search;
    setPages((held) => (held[page] ? held : { ...held, [page]: data.reelMediaSearch.items }));
  }, [data, search]);

  const items = useMemo(
    () =>
      Object.keys(pages)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap((page) => pages[page]),
    [pages]
  );

  const run = useCallback((query: string, kind: StockKind) => {
    const trimmed = query.trim();
    if (trimmed === '') return;
    setPages({});
    setSearch({ query: trimmed, kind, page: 1 });
  }, []);

  const more = useCallback(() => {
    setSearch((current) => (current ? { ...current, page: current.page + 1 } : current));
  }, []);

  return {
    items,
    loading,
    error,
    /** True once a search has been asked for, so an empty grid can say "nothing found" rather than nothing. */
    searched: search !== null,
    hasMore: data?.reelMediaSearch.has_more === true && !loading,
    run,
    more,
  };
}

export type StockSearch = ReturnType<typeof useStockSearch>;
