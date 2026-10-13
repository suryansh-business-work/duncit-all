import { useEffect, useRef, useState } from 'react';
import { CART_CONTROL_NOTICE_MS, cartControlNotice, type CartControlNotice } from '@duncit/utils';

/**
 * The short notice a card shows when its product goes into the cart or comes
 * out of it. It watches the quantity rather than the buttons, so a refused or
 * failed add — which never moves the quantity — raises nothing, and the first
 * render never does either.
 *
 * `armed` is false while the cart behind the quantity is still being read back
 * from the device: the stored units arriving is not the buyer adding anything.
 * Which change earns a notice is decided by `cartControlNotice`, the same rule
 * mWeb draws.
 */
export function useCartControlNotice(quantity: number, armed = true): CartControlNotice | null {
  const previous = useRef({ quantity, armed });
  const [notice, setNotice] = useState<CartControlNotice | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { quantity, armed };
    if (!before.armed || !armed) return;
    const next = cartControlNotice(before.quantity, quantity);
    if (next) setNotice(next);
  }, [quantity, armed]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), CART_CONTROL_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return notice;
}
