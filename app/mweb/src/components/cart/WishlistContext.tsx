import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import { addToWishlist, removeFromWishlist, wishlistKey } from '@duncit/utils';
import { cartLineKey, useCart, type CartLine, type CartLineMeta } from './CartContext';

/** The Pod Shop wishlist — products moved out of the cart to buy later. Kept
 * on the device like the cart. Native twin: src/stores/wishlist.store.ts. */
interface WishlistContextValue {
  items: CartLineMeta[];
  /** Take a line out of the cart and save it here. */
  moveFromCart: (line: CartLine) => void;
  /** Put a saved product back in the cart (one unit) and drop it from here. */
  moveToCart: (item: CartLineMeta) => void;
  remove: (item: CartLineMeta) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = 'mweb_wishlist_lines';

function loadItems(): CartLineMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.pod_id && item?.product_id) : [];
  } catch (error) {
    logs.mWeb.warn('wishlist', 'load', { error });
    return [];
  }
}

/** A cart line without its quantity — the wishlist saves the product, not a count. */
const toMeta = (line: CartLine): CartLineMeta => {
  const meta: CartLineMeta & { quantity?: number } = { ...line };
  delete meta.quantity;
  return meta;
};

export function WishlistProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lines, setLine, removeLine } = useCart();
  const [items, setItems] = useState<CartLineMeta[]>(loadItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // Storage full/blocked — the wishlist still works for the session.
      logs.mWeb.warn('wishlist', 'persist', { error });
    }
  }, [items]);

  const moveFromCart = useCallback(
    (line: CartLine) => {
      setItems((current) => addToWishlist(current, toMeta(line)));
      removeLine(line.pod_id, cartLineKey(line));
    },
    [removeLine],
  );

  const remove = useCallback((item: CartLineMeta) => {
    setItems((current) => removeFromWishlist(current, wishlistKey(item)));
  }, []);

  const moveToCart = useCallback(
    (item: CartLineMeta) => {
      // Already in the cart: one more unit, never past the product's limit.
      const inCart = lines.find(
        (line) => line.pod_id === item.pod_id && cartLineKey(line) === cartLineKey(item),
      );
      setLine(item, Math.min(item.max_quantity, (inCart?.quantity ?? 0) + 1));
      remove(item);
    },
    [lines, setLine, remove],
  );

  const value = useMemo(
    () => ({ items, moveFromCart, moveToCart, remove }),
    [items, moveFromCart, moveToCart, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside WishlistProvider');
  return context;
}
