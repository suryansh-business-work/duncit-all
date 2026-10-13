import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FOOD_ORDER_LIMITS,
  foodCartLines,
  foodCartSignature,
  priceFoodCartLines,
  reconcileFoodCart,
  type FoodCartLine,
  type FoodCartPrice,
  type FoodCartQuantities,
  type VenueFoodItem,
} from '@duncit/utils';

import { readFoodCart, writeFoodCart } from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

export interface FoodCart {
  lines: FoodCartLine[];
  price: FoodCartPrice;
  /** Changes whenever the cart's contents do — a checkout attempt is keyed on it. */
  signature: string;
  /** Dishes that left the menu while they were in the cart, until dismissed. */
  dropped: string[];
  /** An Add was refused because the order already holds the most dishes it may — said in place, the app has no toast. */
  atMaxLines: boolean;
  quantityOf: (itemId: string) => number;
  setQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
  dismissDropped: () => void;
  dismissMaxLines: () => void;
}

/**
 * One venue's cart: kept on the device under the venue id, and held against
 * the menu as it is NOW — a dish that left the menu or went unavailable drops
 * out, and its name is kept so the member can be told. The total is display
 * only; the server prices the order again from its own menu. RN twin of mWeb's
 * food/useFoodCart — the one difference is that the device store answers
 * asynchronously, so nothing is written back until the stored cart was read.
 */
export function useFoodCart(
  venueId: string,
  menu: readonly VenueFoodItem[],
  discountPct: number,
): FoodCart {
  const [stored, setStored] = useState<FoodCartQuantities>({});
  const [hydrated, setHydrated] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const [atMaxLines, setAtMaxLines] = useState(false);

  useEffect(() => {
    let active = true;
    // Another venue's cart is never carried over into this one.
    setStored({});
    setHydrated(false);
    fireAndForget(
      readFoodCart(venueId).then((cart) => {
        if (!active) return;
        // Anything added before the read came back wins over what was stored.
        setStored((prev) => ({ ...cart, ...prev }));
        setHydrated(true);
      }),
    );
    return () => {
      active = false;
    };
  }, [venueId]);

  // What is shown is always the reconciled cart, so a stale entry never
  // reaches the screen even on the render before the effect below tidies it.
  const reconciled = useMemo(() => reconcileFoodCart(stored, menu), [stored, menu]);

  useEffect(() => {
    if (!reconciled.changed) return;
    setStored(reconciled.cart);
    if (reconciled.dropped.length) {
      setDropped((prev) => [...new Set([...prev, ...reconciled.dropped])]);
    }
  }, [reconciled]);

  useEffect(() => {
    if (hydrated) fireAndForget(writeFoodCart(venueId, reconciled.cart));
  }, [venueId, hydrated, reconciled.cart]);

  const lines = useMemo(() => foodCartLines(menu, reconciled.cart), [menu, reconciled.cart]);
  const price = useMemo(() => priceFoodCartLines(lines, discountPct), [lines, discountPct]);
  const signature = useMemo(() => foodCartSignature(lines), [lines]);

  const quantityOf = useCallback(
    (itemId: string) => reconciled.cart[itemId] ?? 0,
    [reconciled.cart],
  );

  const setQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const next = Math.min(FOOD_ORDER_LIMITS.maxQuantity, Math.max(0, Math.floor(quantity)));
      const isNewLine = !(itemId in reconciled.cart);
      const full = Object.keys(reconciled.cart).length >= FOOD_ORDER_LIMITS.maxLines;
      if (next > 0 && isNewLine && full) {
        setAtMaxLines(true);
        return;
      }
      setAtMaxLines(false);
      setStored((prev) =>
        next > 0
          ? { ...prev, [itemId]: next }
          : Object.fromEntries(Object.entries(prev).filter(([id]) => id !== itemId)),
      );
    },
    [reconciled.cart],
  );

  const clear = useCallback(() => setStored({}), []);
  const dismissDropped = useCallback(() => setDropped([]), []);
  const dismissMaxLines = useCallback(() => setAtMaxLines(false), []);

  return {
    lines,
    price,
    signature,
    dropped,
    atMaxLines,
    quantityOf,
    setQuantity,
    clear,
    dismissDropped,
    dismissMaxLines,
  };
}
