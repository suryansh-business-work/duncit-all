import { create } from 'zustand';
import { logs } from '@duncit/logs';
import { addToWishlist, removeFromWishlist, wishlistKey } from '@duncit/utils';

import { getItem, setItem } from '@/services/secure-storage';
import { cartLineKey, useCartStore, type CartLine, type CartLineMeta } from '@/stores/cart.store';

const KEY = 'duncit.wishlist_lines';

interface WishlistState {
  items: CartLineMeta[];
  hydrated: boolean;
  /** Restore the saved list. Safe to call any number of times. */
  hydrate: () => Promise<void>;
  /** Take a line out of the cart and save it here. */
  moveFromCart: (line: CartLine) => Promise<void>;
  /** Put a saved product back in the cart (one more unit) and drop it here. */
  moveToCart: (item: CartLineMeta) => Promise<void>;
  remove: (item: CartLineMeta) => Promise<void>;
}

async function readItems(): Promise<CartLineMeta[]> {
  try {
    const raw = await getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.pod_id && item?.product_id) : [];
  } catch (error) {
    logs.mobileApp.warn('wishlist', 'load', { error });
    return [];
  }
}

const persist = (items: CartLineMeta[]) => {
  setItem(KEY, JSON.stringify(items)).catch((error: unknown) => {
    logs.mobileApp.warn('wishlist', 'persist', { error });
  });
};

/** A cart line without its quantity — the wishlist saves the product, not a count. */
const toMeta = (line: CartLine): CartLineMeta => {
  const meta: CartLineMeta & { quantity?: number } = { ...line };
  delete meta.quantity;
  return meta;
};

let hydration: Promise<void> | null = null;

/** The Pod Shop wishlist — products moved out of the cart to buy later, kept on
 * the device like the cart. Every write waits for the saved list first, so an
 * early tap can never overwrite it. RN twin of mWeb's WishlistContext. */
export const useWishlistStore = create<WishlistState>((set, get) => {
  const write = async (change: (items: CartLineMeta[]) => CartLineMeta[]) => {
    await get().hydrate();
    const next = change(get().items);
    set({ items: next });
    persist(next);
  };
  return {
    items: [],
    hydrated: false,
    hydrate: () => {
      hydration ??= readItems().then((items) => set({ items, hydrated: true }));
      return hydration;
    },
    moveFromCart: async (line) => {
      await write((items) => addToWishlist(items, toMeta(line)));
      useCartStore.getState().removeLine(line.pod_id, cartLineKey(line));
    },
    moveToCart: async (item) => {
      const cart = useCartStore.getState();
      const inCart = cart.lines.find(
        (line) => line.pod_id === item.pod_id && cartLineKey(line) === cartLineKey(item),
      );
      cart.setLine(item, Math.min(item.max_quantity, (inCart?.quantity ?? 0) + 1));
      await write((items) => removeFromWishlist(items, wishlistKey(item)));
    },
    remove: (item) => write((items) => removeFromWishlist(items, wishlistKey(item))),
  };
});
