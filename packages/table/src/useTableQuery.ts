import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableFetch, TableFilterValue, TableQueryState, TableSortDir } from './types';

const SEARCH_DEBOUNCE_MS = 400;

export interface UseTableQueryOptions<T> {
  fetchRows: TableFetch<T>;
  defaultSort?: { field: string; dir: TableSortDir };
  defaultPageSize?: number;
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
}

/**
 * Server-driven table state machine: raw search input debounced (400 ms) into the applied
 * query, 1-based page that resets whenever search/filters/pageSize/sort change, and fetch
 * orchestration with a monotonic sequence guard so stale responses are dropped.
 */
export function useTableQuery<T>(options: UseTableQueryOptions<T>): UseTableQueryResult<T> {
  const { fetchRows, defaultSort, defaultPageSize } = options;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize ?? 25);
  const [sortBy, setSortBy] = useState<string | null>(defaultSort?.field ?? null);
  const [sortDir, setSortDir] = useState<TableSortDir>(defaultSort?.dir ?? 'asc');
  const [filters, setFiltersState] = useState<TableFilterValue[]>([]);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

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
    () => ({ search, page, pageSize, sortBy, sortDir, filters }),
    [search, page, pageSize, sortBy, sortDir, filters],
  );

  useEffect(() => {
    seqRef.current += 1;
    const seq = seqRef.current;
    setLoading(true);
    setError(null);
    fetchRef
      .current(query)
      .then((result) => {
        if (seq !== seqRef.current) return; // stale response — drop it
        setRows(result.rows);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== seqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, [query, reloadTick]);

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
  };
}
