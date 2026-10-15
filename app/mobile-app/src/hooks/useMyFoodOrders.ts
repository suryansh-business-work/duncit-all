import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { logs } from '@duncit/logs';
import {
  appendFoodOrders,
  hasMoreFoodOrders,
  type MyVenueFoodOrder,
  type MyVenueFoodOrderScope,
  type MyVenueFoodOrdersPage,
  type VenueFoodOrderKey,
} from '@duncit/utils';

import { fetchMyFoodOrders } from '@/services/food-customer';
import { storedFoodOrderKeys } from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

type PageInfo = Pick<MyVenueFoodOrdersPage, 'page' | 'page_size' | 'total'>;

/**
 * The caller's own food orders of one scope, a page at a time. The server
 * matches the signed-in account AND the orders this device placed (their keys
 * are sent along), so orders placed without an account show too. `venueId`
 * narrows it to one venue's. Re-read when the screen comes back into view — an
 * order may have moved on meanwhile. RN twin of mWeb's food-orders-page/useMyFoodOrders.
 */
export function useMyFoodOrders(scope: MyVenueFoodOrderScope, pageSize: number, venueId?: string) {
  const navigation = useNavigation();
  const [rows, setRows] = useState<MyVenueFoodOrder[]>([]);
  const [keys, setKeys] = useState<VenueFoodOrderKey[]>([]);
  const [last, setLast] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  // Only the latest read may answer: a slow one must not overwrite a newer one.
  const latest = useRef(0);

  const load = useCallback(async () => {
    latest.current += 1;
    const turn = latest.current;
    try {
      const stored = await storedFoodOrderKeys();
      const page = await fetchMyFoodOrders({
        scope,
        venue_id: venueId ?? null,
        keys: stored,
        page: 1,
        page_size: pageSize,
      });
      if (turn !== latest.current) return;
      setKeys(stored);
      setRows(page.rows);
      setLast(page);
      setFailed(false);
      setMoreFailed(false);
    } catch (err) {
      if (turn !== latest.current) return;
      logs.mobileApp.warn('venueFood', 'myOrders', { error: err, scope });
      setFailed(true);
    }
    setLoading(false);
  }, [scope, venueId, pageSize]);

  useEffect(() => {
    fireAndForget(load());
    let left = false;
    const offBlur = navigation.addListener('blur', () => {
      left = true;
    });
    const offFocus = navigation.addListener('focus', () => {
      if (left) fireAndForget(load());
    });
    return () => {
      latest.current += 1;
      offBlur();
      offFocus();
    };
  }, [load, navigation]);

  const loadMore = useCallback(async () => {
    if (!last || loadingMore) return;
    const turn = latest.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await fetchMyFoodOrders({
        scope,
        venue_id: venueId ?? null,
        keys,
        page: last.page + 1,
        page_size: pageSize,
      });
      if (turn !== latest.current) return;
      setRows((prev) => appendFoodOrders(prev, page.rows));
      setLast(page);
    } catch (err) {
      logs.mobileApp.warn('venueFood', 'myOrdersMore', { error: err, scope });
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [keys, last, loadingMore, pageSize, scope, venueId]);

  return {
    rows,
    keys,
    loading: loading && rows.length === 0,
    /** Only a failure with nothing to show — a failed re-read keeps the list on screen. */
    failed: failed && rows.length === 0,
    hasMore: hasMoreFoodOrders(last),
    loadMore,
    loadingMore,
    moreFailed,
    reload: load,
  };
}

export type MyFoodOrders = ReturnType<typeof useMyFoodOrders>;
