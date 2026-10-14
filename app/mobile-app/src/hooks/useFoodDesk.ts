import { useCallback, useState } from 'react';
import type { FoodOwnerStats, FoodTablePage } from '@duncit/utils';

import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useVenueList } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';
import {
  fetchFoodOwnerVenues,
  fetchFoodStats,
  type FoodPageQuery,
} from '@/services/venue-food-owner';
import { toErrorMessage } from '@/utils/errors';

/** Rows asked for at a time — the board and the coupon list grow by this much on "Load more". */
const FOOD_DESK_PAGE_SIZE = 20;

const pageQuery = (page: number): FoodPageQuery => ({
  page,
  page_size: FOOD_DESK_PAGE_SIZE,
  sort_by: 'created_at',
  sort_dir: 'desc',
});

/** The owner's venues with whether each serves food, and the one the food screens are about. */
export function useFoodDeskVenues() {
  return useVenueList(fetchFoodOwnerVenues);
}

/** `next` laid over `rows` — a row already on screen is replaced where it stands, a new one appended. */
function mergeById<T extends { id: string }>(rows: readonly T[], next: readonly T[]): T[] {
  const incoming = new Map(next.map((row) => [row.id, row]));
  const kept = rows.map((row) => incoming.get(row.id) ?? row);
  const seen = new Set(rows.map((row) => row.id));
  return [...kept, ...next.filter((row) => !seen.has(row.id))];
}

/**
 * One of the food desk's server tables — the order board or the coupon list —
 * newest first, a page at a time. A reload (pull, poll, a create) starts again
 * at the first page; `replaceRow` repaints one row from a mutation's answer.
 */
export function useFoodDeskList<T extends { id: string }>(
  fetchPage: (venueId: string, query: FoodPageQuery) => Promise<FoodTablePage<T>>,
  venueId: string | null,
) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const failed = useCallback(
    (err: unknown) => setError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
    [t],
  );

  const load = useCallback(async () => {
    if (!venueId) return;
    const first = await fetchPage(venueId, pageQuery(1));
    setRows(first.rows);
    setTotal(first.total);
    setPage(1);
    setError(null);
  }, [fetchPage, venueId]);
  const query = useReloadableQuery(load, { enabled: !!venueId, onError: failed });

  const loadMore = useCallback(async () => {
    if (!venueId) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(venueId, pageQuery(page + 1));
      setRows((current) => mergeById(current, next.rows));
      setTotal(next.total);
      setPage(page + 1);
    } catch (err) {
      failed(err);
    } finally {
      setLoadingMore(false);
    }
  }, [failed, fetchPage, page, venueId]);

  const replaceRow = useCallback((row: T) => setRows((current) => mergeById(current, [row])), []);

  return {
    rows,
    hasMore: rows.length < total,
    isLoading: query.isLoading,
    loadingMore,
    error,
    refetch: query.refetch,
    loadMore,
    replaceRow,
  };
}

/** One venue's food numbers for the picked period (`days` 0 is all time). */
export function useFoodStats(venueId: string | null, days: number) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<FoodOwnerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    setStats(await fetchFoodStats(venueId, days));
    setError(null);
  }, [venueId, days]);
  const query = useReloadableQuery(load, {
    enabled: !!venueId,
    onError: (err) => setError(toErrorMessage(err, t('mweb.account.somethingWentWrong'))),
  });

  return { stats, error, isLoading: query.isLoading, refetch: query.refetch };
}
