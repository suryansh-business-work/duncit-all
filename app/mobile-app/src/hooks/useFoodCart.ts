import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FOOD_ORDER_LIMITS,
  foodCartLines,
  foodCartSignature,
  foodCartTaxOf,
  priceFoodCartLines,
  reconcileFoodCart,
  type FoodCartLine,
  type FoodCartPrice,
  type FoodCartQuantities,
  type FoodCartTax,
  type VenueFoodItem,
} from '@duncit/utils';

import {
  readFoodCart,
  readFoodCoupon,
  writeFoodCart,
  writeFoodCoupon,
  type AppliedFoodCoupon,
} from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

export interface FoodCart {
  lines: FoodCartLine[];
  price: FoodCartPrice;
  /** Changes whenever the cart's contents do — a checkout attempt is keyed on it. */
  signature: string;
  /** The venue's coupon applied to this cart; `price` already counts it. */
  coupon: AppliedFoodCoupon | null;
  /** Dishes that left the menu while they were in the cart, until dismissed. */
  dropped: string[];
  /** An Add was refused because the order already holds the most dishes it may — said in place, the app has no toast. */
  atMaxLines: boolean;
  /** The stored cart was read back — before that, a quantity arriving is not the member adding. */
  hydrated: boolean;
  quantityOf: (itemId: string) => number;
  setQuantity: (itemId: string, quantity: number) => void;
  /** Keep a coupon the server's preview accepted. */
  applyCoupon: (coupon: AppliedFoodCoupon) => void;
  removeCoupon: () => void;
  clear: () => void;
  /**
   * Read the stored cart again. A dish's own screen keeps the same cart, so the
   * menu underneath re-reads it when the member comes back to it.
   */
  reload: () => void;
  dismissDropped: () => void;
  dismissMaxLines: () => void;
}

/**
 * One venue's cart: kept on the device under the venue id, and held against
 * the menu as it is NOW — a dish that left the menu or went unavailable drops
 * out, and its name is kept so the member can be told. The venue's coupon the
 * member applied is kept with it, and goes when the cart is emptied or ordered.
 * The total is display only; the server prices the order again from its own
 * menu and its own reading of the coupon. RN twin of mWeb's
 * food/useFoodCart — the one difference is that the device store answers
 * asynchronously, so nothing is written back until the stored cart was read.
 */
export function useFoodCart(
  venueId: string,
  menu: readonly VenueFoodItem[],
  discountPct: number,
  /** The venue's `food_ordering` — the GST the server resolved for it. */
  ordering?: Partial<FoodCartTax> | null,
): FoodCart {
  // Primitives, so a re-read venue with the same GST does not re-price the cart.
  const taxMode = ordering?.tax_mode;
  const gstPct = ordering?.gst_pct;
  const tax = useMemo(
    () => foodCartTaxOf({ tax_mode: taxMode, gst_pct: gstPct }),
    [taxMode, gstPct],
  );
  const [stored, setStored] = useState<FoodCartQuantities>({});
  const [coupon, setCoupon] = useState<AppliedFoodCoupon | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const [atMaxLines, setAtMaxLines] = useState(false);

  useEffect(() => {
    let active = true;
    // Another venue's cart, or its coupon, is never carried over into this one.
    setStored({});
    setCoupon(null);
    setHydrated(false);
    fireAndForget(
      Promise.all([readFoodCart(venueId), readFoodCoupon(venueId)]).then(([cart, kept]) => {
        if (!active) return;
        // Anything added before the read came back wins over what was stored.
        setStored((prev) => ({ ...cart, ...prev }));
        setCoupon((prev) => prev ?? kept);
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
  const price = useMemo(
    () => priceFoodCartLines(lines, discountPct, coupon, tax),
    [lines, discountPct, coupon, tax],
  );
  const signature = useMemo(() => foodCartSignature(lines), [lines]);

  // A coupon belongs to the cart it was applied to: an emptied cart starts over without one.
  const empty = lines.length === 0;
  useEffect(() => {
    if (hydrated && empty) setCoupon(null);
  }, [hydrated, empty]);

  useEffect(() => {
    if (hydrated) fireAndForget(writeFoodCoupon(venueId, coupon));
  }, [venueId, hydrated, coupon]);

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

  const removeCoupon = useCallback(() => setCoupon(null), []);
  const clear = useCallback(() => {
    setStored({});
    setCoupon(null);
  }, []);
  const reload = useCallback(() => {
    fireAndForget(
      Promise.all([readFoodCart(venueId), readFoodCoupon(venueId)]).then(([cart, kept]) => {
        setStored(cart);
        setCoupon(kept);
      }),
    );
  }, [venueId]);
  const dismissDropped = useCallback(() => setDropped([]), []);
  const dismissMaxLines = useCallback(() => setAtMaxLines(false), []);

  return {
    lines,
    price,
    signature,
    coupon,
    dropped,
    atMaxLines,
    hydrated,
    quantityOf,
    setQuantity,
    applyCoupon: setCoupon,
    removeCoupon,
    clear,
    reload,
    dismissDropped,
    dismissMaxLines,
  };
}
