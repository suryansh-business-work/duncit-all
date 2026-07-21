import { useCallback, useMemo } from 'react';
import { useCart, cartLineKey, type CartLineMeta } from '../../components/cart/CartContext';
import { parseSelectionKey } from '../../utils/product-selection';

/**
 * Pod-page product selection, backed by the global cart so selections survive
 * navigation and power the cart page/floating button. Keys in the returned map
 * are `product_id` (base line) or `product_id::variant_id` (a chosen variant,
 * added via the product-detail dialog).
 */
export function usePodProductSelection(id: string, pod: any) {
  const { lines, setLine } = useCart();
  const podLines = useMemo(() => lines.filter((line) => line.pod_id === id), [lines, id]);

  const selectedProducts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of podLines) map[cartLineKey(line)] = line.quantity;
    return map;
  }, [podLines]);

  // Writes from the pod rows create/adjust BASE lines only — variant lines are
  // managed by the detail dialog through setVariantQuantity below.
  const setSelectedProducts = useCallback(
    (next: Record<string, number>) => {
      const rows = new Map<string, any>(
        (pod?.product_requests ?? []).map((row: any) => [String(row.product_id), row]),
      );
      const keys = new Set<string>([...Object.keys(next), ...podLines.map(cartLineKey)]);
      for (const key of keys) {
        const quantity = next[key] ?? 0;
        const existing = podLines.find((line) => cartLineKey(line) === key);
        if (existing) {
          if (existing.quantity !== quantity) setLine(existing, quantity);
          continue;
        }
        const { product_id, variant_id } = parseSelectionKey(key);
        const row = rows.get(product_id);
        if (!row || variant_id) continue;
        setLine(
          {
            pod_id: id,
            pod_title: pod?.pod_title ?? '',
            club_slug: pod?.club_slug ?? '',
            product_id,
            variant_id: '',
            variant_label: '',
            product_name: row.product_name ?? 'Product',
            image_url: row.image_url || row.images?.[0] || '',
            unit_cost: Number(row.unit_cost || 0),
            max_quantity: Number(row.available_count ?? row.quantity ?? 0),
          },
          quantity,
        );
      }
    },
    [id, pod, podLines, setLine],
  );

  /** Add/adjust a specific variant's line (from the product-detail dialog). */
  const setVariantQuantity = useCallback(
    (meta: CartLineMeta, quantity: number) => setLine(meta, quantity),
    [setLine],
  );

  const selectedProductList = useMemo(
    () =>
      podLines
        .map((line) => ({
          ...parseSelectionKey(cartLineKey(line)),
          quantity: line.quantity,
          unit_cost: line.unit_cost,
        }))
        .filter((item) => item.quantity > 0),
    [podLines],
  );

  const selectedProductTotal = useMemo(
    () => podLines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0),
    [podLines],
  );

  return {
    selectedProducts,
    selectedProductList,
    selectedProductTotal,
    setSelectedProducts,
    setVariantQuantity,
  };
}
