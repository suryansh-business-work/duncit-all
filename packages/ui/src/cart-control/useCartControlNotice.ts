import { useEffect, useRef, useState } from 'react';
import { CART_CONTROL_NOTICE_MS, cartControlNotice, type CartControlNotice } from '@duncit/utils';

/**
 * The notice a product card shows after its quantity moves in or out of the
 * cart — "Item added" on the first unit, "Item removed" on the last — for
 * `CART_CONTROL_NOTICE_MS`, then nothing.
 *
 * It watches the quantity rather than the taps, so the notice follows what the
 * cart really did: a refused add raises none, and a removal made from the cart
 * page reaches a card still on screen. Nothing is raised on mount — a product
 * already in the cart was not just added.
 */
export function useCartControlNotice(quantity: number): CartControlNotice | null {
  const [notice, setNotice] = useState<CartControlNotice | null>(null);
  const previous = useRef(quantity);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const next = cartControlNotice(previous.current, quantity);
    previous.current = quantity;
    // A step between two and three earns no notice, and must not cut short the
    // "Item added" still on screen from the tap before it.
    if (!next) return;
    clearTimeout(timer.current);
    setNotice(next);
    timer.current = setTimeout(() => setNotice(null), CART_CONTROL_NOTICE_MS);
  }, [quantity]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return notice;
}
