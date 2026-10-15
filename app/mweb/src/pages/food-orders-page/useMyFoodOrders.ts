import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  appendFoodOrders,
  hasMoreFoodOrders,
  type MyVenueFoodOrder,
  type MyVenueFoodOrderScope,
  type MyVenueFoodOrdersInput,
} from '@duncit/utils';
import { storedFoodOrderKeys } from '../VenueDetailsPage/food/foodStorage';
import { MY_VENUE_FOOD_ORDERS, type MyVenueFoodOrdersData, type MyVenueFoodOrdersVars } from '../VenueDetailsPage/food/queries';

interface MoreRows {
  rows: MyVenueFoodOrder[];
  page: number;
  total: number;
}

/**
 * The caller's own food orders of one scope, a page at a time. The server
 * matches the signed-in account AND the orders this browser placed (their keys
 * are sent along), so a guest's orders show without an account and a member's
 * follow them across devices. `venueId` narrows it to one venue's orders.
 * Native twin: hooks/useMyFoodOrders.
 */
export function useMyFoodOrders(scope: MyVenueFoodOrderScope, pageSize: number, venueId?: string) {
  const client = useApolloClient();
  // Read once per mount — an order placed meanwhile is on another page.
  const keys = useMemo(() => storedFoodOrderKeys(), []);
  const input = useMemo<MyVenueFoodOrdersInput>(
    () => ({ scope, venue_id: venueId ?? null, keys, page: 1, page_size: pageSize }),
    [scope, venueId, keys, pageSize],
  );
  const { data, loading, error, refetch } = useQuery<MyVenueFoodOrdersData, MyVenueFoodOrdersVars>(MY_VENUE_FOOD_ORDERS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });
  const [more, setMore] = useState<MoreRows | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const first = data?.myVenueFoodOrders;
  const rows = useMemo(() => appendFoodOrders(first?.rows ?? [], more?.rows ?? []), [first, more]);
  const last = useMemo(
    () => (more ? { page: more.page, page_size: pageSize, total: more.total } : first),
    [more, pageSize, first],
  );

  const loadMore = useCallback(async () => {
    if (!last || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const result = await client.query<MyVenueFoodOrdersData, MyVenueFoodOrdersVars>({
        query: MY_VENUE_FOOD_ORDERS,
        variables: { input: { ...input, page: last.page + 1 } },
        fetchPolicy: 'network-only',
      });
      const next = result.data?.myVenueFoodOrders;
      if (next) setMore((prev) => ({ rows: appendFoodOrders(prev?.rows ?? [], next.rows), page: next.page, total: next.total }));
    } catch (err) {
      logs.mWeb.warn('venueFood', 'myOrdersMore', { error: err, scope });
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [client, input, last, loadingMore, scope]);

  const reload = useCallback(() => {
    setMore(null);
    refetch().catch((err: unknown) => logs.mWeb.warn('venueFood', 'myOrdersReload', { error: err, scope }));
  }, [refetch, scope]);

  useEffect(() => {
    if (error) logs.mWeb.warn('venueFood', 'myOrders', { error, scope });
  }, [error, scope]);

  return {
    rows,
    keys,
    loading: loading && !first,
    /** Only an error with nothing to show — a failed re-read keeps the list on screen. */
    failed: !!error && !first,
    hasMore: hasMoreFoodOrders(last),
    loadMore,
    loadingMore,
    moreFailed,
    reload,
  };
}
