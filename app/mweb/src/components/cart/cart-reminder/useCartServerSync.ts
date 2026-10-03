import { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { toCartSyncLines } from '@duncit/utils';
import { useCart } from '../CartContext';
import { SYNC_MY_PRODUCT_CART } from './queries';

/** Quantity taps settle before the cart is sent. */
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Mirrors the signed-in member's cart to the server so the "your cart is
 * calling" email knows what is waiting (ids and quantities only). An empty
 * cart is sent only when it EMPTIED this session — checkout or Clear cart —
 * so a fresh launch with nothing in it never wipes a cart another device
 * mirrored. Native twin: src/hooks/useCartServerSync.ts.
 */
export function useCartServerSync() {
  const { lines } = useCart();
  const [sync] = useMutation(SYNC_MY_PRODUCT_CART);
  const hadItems = useRef(false);

  useEffect(() => {
    const empty = lines.length === 0;
    if (empty && !hadItems.current) return undefined;
    hadItems.current = !empty;
    const send = () => {
      sync({ variables: { lines: toCartSyncLines(lines) } }).catch((error: unknown) => {
        // Background mirror only — the cart itself is unaffected, so the
        // member is not interrupted; the next change retries.
        logs.mWeb.warn('cart', 'sync', { error });
      });
    };
    if (empty) {
      send();
      return undefined;
    }
    const timer = setTimeout(send, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [lines, sync]);
}
