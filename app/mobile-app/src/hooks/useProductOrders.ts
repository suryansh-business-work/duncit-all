import { useEffect, useState } from 'react';

import { MyProductOrdersForPodDocument } from '@/graphql/product-orders';
import { graphqlRequest } from '@/services/graphql.client';
import type { ProductOrder } from '@/utils/product-orders';

/** The signed-in buyer's product orders for a pod. Skips fetching when no pod id
 * is provided. RN twin of mWeb's PodProductOrdersCard useQuery. */
export function useProductOrders(podId?: string) {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (!podId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(MyProductOrdersForPodDocument, { podId }, { auth: true })
      .then((d) => {
        if (active) setOrders(d.myProductOrdersForPod);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [podId]);

  return { orders, isLoading, error };
}
