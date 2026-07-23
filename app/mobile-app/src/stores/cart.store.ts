import { create } from 'zustand';

import { getCartLines, setCartLines, type CartLine } from '@/services/cart';
import { selectionKey } from '@/utils/product-selection';

export type { CartLine } from '@/services/cart';

export type CartLineMeta = Omit<CartLine, 'quantity'>;

/** Stable per-pod key for a line (product or product::variant). */
export const cartLineKey = (line: { product_id: string; variant_id: string }): string =>
  selectionKey(line.product_id, line.variant_id || null);

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  /** Restore the persisted cart on launch. */
  hydrate: () => Promise<void>;
  /** Create/replace a line's quantity; qty <= 0 removes it. Persists. */
  setLine: (meta: CartLineMeta, quantity: number) => void;
  removeLine: (podId: string, key: string) => void;
  /** Empty the whole cart (post-checkout / Clear cart). Persists. */
  clearAll: () => void;
}

const persist = (lines: CartLine[]) => {
  setCartLines(lines).catch(() => undefined);
};

/** Global cart — products added from any Pod Shop, persisted across launches.
 * RN twin of mWeb's CartProvider; the product checkout pays ALL lines at once. */
export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  hydrated: false,
  hydrate: async () => {
    const lines = await getCartLines();
    set({ lines, hydrated: true });
  },
  setLine: (meta, quantity) => {
    // Update in place so quantity changes never reorder the cart.
    const current = get().lines;
    const index = current.findIndex(
      (line) => line.pod_id === meta.pod_id && cartLineKey(line) === cartLineKey(meta),
    );
    let next: CartLine[];
    if (quantity <= 0) {
      next = index === -1 ? current : current.filter((_, i) => i !== index);
    } else if (index === -1) {
      next = [...current, { ...meta, quantity }];
    } else {
      next = [...current];
      next[index] = { ...meta, quantity };
    }
    set({ lines: next });
    persist(next);
  },
  removeLine: (podId, key) => {
    const next = get().lines.filter(
      (line) => !(line.pod_id === podId && cartLineKey(line) === key),
    );
    set({ lines: next });
    persist(next);
  },
  clearAll: () => {
    set({ lines: [] });
    persist([]);
  },
}));

/** Total units across the cart — drives the floating button badge. */
export const selectCartCount = (state: CartState): number =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);

/** Grand total (₹) across every cart line — drives the cart-wide checkout CTA. */
export const selectCartTotal = (state: CartState): number =>
  state.lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);

/** Cart lines grouped by pod (insertion order kept) — shared by the cart screen
 * and the combined product-checkout summary. */
export const groupLinesByPod = (
  lines: CartLine[],
): [string, { title: string; lines: CartLine[] }][] => {
  const byPod = new Map<string, { title: string; lines: CartLine[] }>();
  for (const line of lines) {
    const group = byPod.get(line.pod_id) ?? { title: line.pod_title, lines: [] };
    group.lines.push(line);
    byPod.set(line.pod_id, group);
  }
  return Array.from(byPod.entries());
};
