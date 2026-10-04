import { useCallback, useState } from 'react';

import { MyPodShopReturnsDocument } from '@/graphql/pod-shop-returns';
import { MyProductOrdersDocument } from '@/graphql/product-orders';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import type { HistoryOrder, PodShopReturn } from '@/utils/product-orders';

/**
 * My Product Orders' data: every order the buyer placed and every pod-shop
 * return they asked for. Both reload on pull-to-refresh (via useReloadableQuery)
 * and together through `reload`, because a return changes what is still
 * returnable. RN twin of the two useQuery calls in mWeb's OrdersHistoryPage.
 */
export function useOrdersHistory() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [returns, setReturns] = useState<PodShopReturn[]>([]);
  const [error, setError] = useState('');
  const [returnsError, setReturnsError] = useState('');

  const loadOrders = useCallback(async () => {
    const data = await graphqlRequest(MyProductOrdersDocument, undefined, { auth: true });
    setOrders(data.myProductOrders);
    setError('');
  }, []);
  const loadReturns = useCallback(async () => {
    const data = await graphqlRequest(MyPodShopReturnsDocument, undefined, { auth: true });
    setReturns(data.myPodShopReturns);
    setReturnsError('');
  }, []);

  const ordersQuery = useReloadableQuery(loadOrders, {
    onError: (e) => setError(toErrorMessage(e, t('mweb.ordersHistory.loadFailed'))),
  });
  const returnsQuery = useReloadableQuery(loadReturns, {
    onError: () => setReturnsError(t('mweb.podShopReturns.loadFailed')),
  });

  const { refetch: refetchOrders } = ordersQuery;
  const { refetch: refetchReturns } = returnsQuery;
  const reload = useCallback(
    () => Promise.all([refetchOrders(), refetchReturns()]),
    [refetchOrders, refetchReturns],
  );

  return { orders, returns, isLoading: ordersQuery.isLoading, error, returnsError, reload };
}
