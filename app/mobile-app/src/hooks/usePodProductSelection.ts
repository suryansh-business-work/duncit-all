import { useEffect, useMemo, useState } from 'react';

import type { PodDetail } from '@/hooks/useDetails';

/** One picked product carried to checkout — matches the server's
 * CheckoutProductSelectionInput ({ product_id, quantity }). */
export interface SelectedProduct {
  product_id: string;
  quantity: number;
}

/**
 * Buyer's pod-shop selection — a `{ productId: qty }` map plus the derived list
 * and running total. RN twin of mWeb's usePodProductSelection. Resets whenever
 * the pod id changes so a different pod never inherits a stale basket.
 */
export function usePodProductSelection(podId: string, pod: PodDetail | null) {
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelectedProducts({});
  }, [podId]);

  const selectedProductList = useMemo<SelectedProduct[]>(
    () =>
      Object.entries(selectedProducts)
        .map(([product_id, quantity]) => ({ product_id, quantity }))
        .filter((item) => item.quantity > 0),
    [selectedProducts],
  );

  const selectedProductTotal = useMemo(() => {
    const byId = new Map((pod?.product_requests ?? []).map((item) => [item.product_id, item]));
    return selectedProductList.reduce(
      (sum, item) => sum + Number(byId.get(item.product_id)?.unit_cost ?? 0) * item.quantity,
      0,
    );
  }, [pod?.product_requests, selectedProductList]);

  return { selectedProducts, selectedProductList, selectedProductTotal, setSelectedProducts };
}
