import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { selectionKey } from '../../utils/product-selection';

/** One cart line — a product (or a specific variant of it) from one pod's shop.
 * Mirrored in the mobile app's cart store (src/stores/cart.store.ts). */
export interface CartLine {
  pod_id: string;
  pod_title: string;
  club_slug: string;
  product_id: string;
  variant_id: string;
  variant_label: string;
  product_name: string;
  image_url: string;
  unit_cost: number;
  quantity: number;
  max_quantity: number;
}

export type CartLineMeta = Omit<CartLine, 'quantity'>;

interface CartContextValue {
  lines: CartLine[];
  /** Create/replace a line's quantity; qty <= 0 removes it. */
  setLine: (meta: CartLineMeta, quantity: number) => void;
  removeLine: (podId: string, key: string) => void;
  clearPod: (podId: string) => void;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'mweb_cart_lines';

const lineKey = (line: { product_id: string; variant_id: string }) =>
  selectionKey(line.product_id, line.variant_id || null);

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l?.pod_id && l?.product_id) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [lines, setLines] = useState<CartLine[]>(loadLines);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full/blocked — the cart still works for the session.
    }
  }, [lines]);

  const setLine = useCallback((meta: CartLineMeta, quantity: number) => {
    setLines((current) => {
      // Update in place so quantity changes never reorder the cart.
      const index = current.findIndex(
        (l) => l.pod_id === meta.pod_id && lineKey(l) === lineKey(meta),
      );
      if (quantity <= 0) return index === -1 ? current : current.filter((_, i) => i !== index);
      if (index === -1) return [...current, { ...meta, quantity }];
      const next = [...current];
      next[index] = { ...meta, quantity };
      return next;
    });
  }, []);

  const removeLine = useCallback((podId: string, key: string) => {
    setLines((current) => current.filter((l) => !(l.pod_id === podId && lineKey(l) === key)));
  }, []);

  const clearPod = useCallback((podId: string) => {
    setLines((current) => current.filter((l) => l.pod_id !== podId));
  }, []);

  const totalCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, setLine, removeLine, clearPod, totalCount }),
    [lines, setLine, removeLine, clearPod, totalCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

export { lineKey as cartLineKey };
