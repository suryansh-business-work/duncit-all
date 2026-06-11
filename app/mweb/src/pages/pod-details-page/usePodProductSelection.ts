import { useEffect, useMemo, useState } from 'react';

export function usePodProductSelection(id: string, pod: any) {
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelectedProducts({});
  }, [id]);

  const selectedProductList = useMemo(() => Object.entries(selectedProducts)
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .filter((item) => item.quantity > 0), [selectedProducts]);

  const selectedProductTotal = useMemo(() => {
    const byId = new Map<string, any>((pod?.product_requests ?? []).map((item: any) => [item.product_id, item]));
    return selectedProductList.reduce((sum, item) => sum + Number(byId.get(item.product_id)?.unit_cost ?? 0) * item.quantity, 0);
  }, [pod?.product_requests, selectedProductList]);

  return { selectedProducts, selectedProductList, selectedProductTotal, setSelectedProducts };
}