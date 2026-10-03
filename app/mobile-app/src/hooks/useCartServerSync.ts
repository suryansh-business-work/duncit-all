import { useEffect, useRef } from 'react';
import { logs } from '@duncit/logs';
import { toCartSyncLines } from '@duncit/utils';

import { MobileSyncMyProductCartDocument } from '@/graphql/product-cart';
import { graphqlRequest } from '@/services/graphql.client';
import { useCartStore } from '@/stores/cart.store';

/** Quantity taps settle before the cart is sent. */
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Mirrors the signed-in member's cart to the server so the "your cart is
 * calling" email knows what is waiting (ids and quantities only). An empty
 * cart is sent only when it EMPTIED while the app ran — checkout or Clear cart
 * — so a fresh launch with nothing in it never wipes a cart another device
 * mirrored. Twin of mWeb's useCartServerSync.
 */
export function useCartServerSync() {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  const hadItems = useRef(false);

  useEffect(() => {
    if (!hydrated) return undefined;
    const empty = lines.length === 0;
    if (empty && !hadItems.current) return undefined;
    hadItems.current = !empty;
    const send = () => {
      graphqlRequest(
        MobileSyncMyProductCartDocument,
        { lines: toCartSyncLines(lines) },
        { auth: true },
      ).catch((error: unknown) => {
        // Background mirror only — the cart itself is unaffected, so the
        // member is not interrupted; the next change retries.
        logs.mobileApp.warn('cart', 'sync', { error });
      });
    };
    if (empty) {
      send();
      return undefined;
    }
    const timer = setTimeout(send, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [lines, hydrated]);
}
