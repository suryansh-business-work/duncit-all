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
  clearPod: (podId: string) => void;
}

const persist = (lines: CartLine[]) => {
  setCartLines(lines).catch(() => undefined);
};

/** Global cart — products added from any Pod Shop, persisted across launches.
 * RN twin of mWeb's CartProvider; checkout consumes one pod's lines at a time. */
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
  clearPod: (podId) => {
    const next = get().lines.filter((line) => line.pod_id !== podId);
    set({ lines: next });
    persist(next);
  },
}));

/** Total units across the cart — drives the floating button badge. */
export const selectCartCount = (state: CartState): number =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);
