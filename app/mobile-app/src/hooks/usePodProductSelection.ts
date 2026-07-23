import { useCallback, useMemo } from 'react';

import type { PodDetail } from '@/hooks/useDetails';
import { cartLineKey, useCartStore, type CartLineMeta } from '@/stores/cart.store';
import { parseSelectionKey } from '@/utils/product-selection';

/** One picked product line carried to checkout. `variant_id` is set when the
 * buyer chose a variant in the detail sheet; `unit_cost` is the display price
 * for that line (the server re-prices authoritatively). */
export interface SelectedProduct {
  product_id: string;
  quantity: number;
  variant_id?: string;
  unit_cost?: number;
}

/**
 * Buyer's pod-shop selection, backed by the global cart so picks survive
 * navigation and power the cart screen/floating button. Keys in the map are
 * `product_id` (base line) or `product_id::variant_id` (a chosen variant).
 * RN twin of mWeb's usePodProductSelection.
 */
export function usePodProductSelection(podId: string, pod: PodDetail | null) {
  const lines = useCartStore((s) => s.lines);
  const setLine = useCartStore((s) => s.setLine);
  const podLines = useMemo(() => lines.filter((line) => line.pod_id === podId), [lines, podId]);

  const selectedProducts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of podLines) map[cartLineKey(line)] = line.quantity;
    return map;
  }, [podLines]);

  // Writes from the pod rows create/adjust BASE lines only — variant lines are
  // managed by the detail sheet through setVariantQuantity below.
  const setSelectedProducts = useCallback(
    (next: Record<string, number>) => {
      const rows = new Map(
        (pod?.product_requests ?? []).map((row) => [String(row.product_id), row]),
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
        const row: any = rows.get(product_id);
        if (!row || variant_id) continue;
        setLine(
          {
            pod_id: podId,
            pod_title: (pod as any)?.pod_title ?? '',
            club_slug: (pod as any)?.club_slug ?? '',
            product_id,
            variant_id: '',
            variant_label: '',
            product_name: row.product_name ?? 'Product',
            image_url: row.image_url || row.images?.[0] || '',
            unit_cost: Number(row.unit_cost || 0),
            max_quantity: Number(row.available_count ?? row.quantity ?? 0),
            free_delivery_above: row.free_delivery_above ?? null,
          },
          quantity,
        );
      }
    },
    [podId, pod, podLines, setLine],
  );

  /** Add/adjust a specific variant's line (from the product-detail sheet). */
  const setVariantQuantity = useCallback(
    (meta: CartLineMeta, quantity: number) => setLine(meta, quantity),
    [setLine],
  );

  const selectedProductList = useMemo<SelectedProduct[]>(
    () =>
      podLines
        .map((line) => {
          const { product_id, variant_id } = parseSelectionKey(cartLineKey(line));
          return { product_id, variant_id, quantity: line.quantity, unit_cost: line.unit_cost };
        })
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
