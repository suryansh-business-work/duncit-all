import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableFetch, TableFilterValue, TableQueryState, TableSortDir } from './types';

const SEARCH_DEBOUNCE_MS = 400;

export interface UseTableQueryOptions<T> {
  fetchRows: TableFetch<T>;
  defaultSort?: { field: string; dir: TableSortDir };
  defaultPageSize?: number;
  /**
   * Page-level filters owned by controls OUTSIDE the table (tabs, selects, URL
   * params). Compared by value: a change resets the page to 1 and refetches.
   * They are appended to the fetch query's filters but never shown as chips.
   */
  externalFilters?: ReadonlyArray<TableFilterValue>;
  /** Row identity, so {@link UseTableQueryResult.updateRow} can find its row. */
  getRowId?: (row: T) => string;
}

export interface UseTableQueryResult<T> {
  rows: T[];
  total: number;
  loading: boolean;
  error: string | null;
  query: TableQueryState;
  searchInput: string;
  setSearchInput: (value: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string | null, dir: TableSortDir) => void;
  setFilters: (filters: TableFilterValue[]) => void;
  refetch: () => void;
  /**
   * Replace ONE row in place, by id.
   *
   * For the common case where an action already knows the answer: a mutation
   * that returns the updated entity has said everything a refetch would go and
   * ask for. Putting it straight into the row skips the round-trip, and because
   * only that row's object identity changes, AG Grid repaints that row alone —
   * every other row, the scroll position and the open page are untouched.
   *
   * A row that is not on the current page is ignored: it is not on screen, and
   * inventing it would put a row in front of the reader that the query it is
   * looking at never returned.
   */
  updateRow: (row: T) => void;
}

/**
 * Server-driven table state machine: raw search input debounced (400 ms) into the applied
 * query, 1-based page that resets whenever search/filters/pageSize/sort change, and fetch
 * orchestration with a monotonic sequence guard so stale responses are dropped.
 */
export function useTableQuery<T>(options: UseTableQueryOptions<T>): UseTableQueryResult<T> {
  const { fetchRows, defaultSort, defaultPageSize, getRowId } = options;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageState, setPageState] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(defaultPageSize ?? 25);
  const [sortBy, setSortBy] = useState<string | null>(defaultSort?.field ?? null);
  const [sortDir, setSortDir] = useState<TableSortDir>(defaultSort?.dir ?? 'asc');
  const [filtersState, setFiltersState] = useState<TableFilterValue[]>([]);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // External filters are compared by VALUE (callers rebuild the array every render);
  // a change resets paging synchronously (derived-state pattern) so the fetch
  // effect below runs exactly once with the new filters + page 1.
  const externalKey = JSON.stringify(options.externalFilters ?? []);
  const [prevExternalKey, setPrevExternalKey] = useState(externalKey);
  if (prevExternalKey !== externalKey) {
    setPrevExternalKey(externalKey);
    setPageState(1);
  }
  const externalFilters = useMemo(
    () => JSON.parse(externalKey) as TableFilterValue[],
    [externalKey],
  );

  const seqRef = useRef(0);
  const fetchRef = useRef(fetchRows);
  fetchRef.current = fetchRows;
  const appliedSearchRef = useRef('');

  // Debounce the raw input into the applied search; cleared on change/unmount.
  useEffect(() => {
    if (searchInput === appliedSearchRef.current) return undefined;
    const timer = globalThis.setTimeout(() => {
      appliedSearchRef.current = searchInput;
      setSearch(searchInput);
      setPageState(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo<TableQueryState>(
    () => ({
      search,
      page: pageState,
      pageSize: pageSizeState,
      sortBy,
      sortDir,
      filters: filtersState,
    }),
    [search, pageState, pageSizeState, sortBy, sortDir, filtersState],
  );

  // What fetchRows actually receives: the visible query plus the pinned external
  // filters. `query` itself stays external-free so toolbar chips only show the
  // user's own filters.
  const fetchQuery = useMemo<TableQueryState>(() => {
    if (!externalFilters.length) return query;
    return { ...query, filters: [...query.filters, ...externalFilters] };
  }, [query, externalFilters]);

  useEffect(() => {
    seqRef.current += 1;
    const seq = seqRef.current;
    setLoading(true);
    setError(null);
    fetchRef
      .current(fetchQuery)
      .then((result) => {
        if (seq !== seqRef.current) return; // stale response — drop it
        // An empty page that is not an empty table means the rows under us went
        // away — a bulk delete on the last page, or someone else's. Go back to
        // page one and let the effect run again rather than committing a view
        // that reads "No rows" over a pager saying "26–25 of 25".
        if (result.rows.length === 0 && result.total > 0 && fetchQuery.page > 1) {
          setTotal(result.total);
          setPageState(1);
          return;
        }
        setRows(result.rows);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== seqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, [fetchQuery, reloadTick]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const setSort = useCallback((field: string | null, dir: TableSortDir) => {
    setSortBy(field);
    setSortDir(dir);
    setPageState(1);
  }, []);

  const setFilters = useCallback((next: TableFilterValue[]) => {
    setFiltersState(next);
    setPageState(1);
  }, []);

  const refetch = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  // Read through a ref so updateRow stays referentially stable — it is handed
  // to parents through a ref of their own, and a changing identity there would
  // re-run their effects on every render.
  const rowIdRef = useRef(getRowId);
  rowIdRef.current = getRowId;

  const updateRow = useCallback((next: T) => {
    const identify = rowIdRef.current;
    if (!identify) return;
    const id = identify(next);
    setRows((prev) => {
      const index = prev.findIndex((row) => identify(row) === id);
      if (index === -1) return prev;
      const out = [...prev];
      out[index] = next;
      return out;
    });
  }, []);

  return {
    rows,
    total,
    loading,
    error,
    query,
    searchInput,
    setSearchInput,
    setPage,
    setPageSize,
    setSort,
    setFilters,
    refetch,
    updateRow,
  };
}
