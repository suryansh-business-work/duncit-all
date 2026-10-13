import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FOOD_ORDER_LIMITS,
  priceFoodCart,
  reconcileFoodCart,
  type FoodCartPrice,
  type FoodCartQuantities,
  type VenueFoodItem,
} from '@duncit/utils';
import { notify } from '../../../components/notify';
import { useTranslation } from '../../../i18n/useTranslation';
import { readFoodCart, writeFoodCart } from './foodStorage';

export interface FoodCartLine {
  item: VenueFoodItem;
  quantity: number;
}

export interface FoodCart {
  lines: FoodCartLine[];
  price: FoodCartPrice;
  /** Changes whenever the cart's contents do — a checkout attempt is keyed on it. */
  signature: string;
  /** Dishes that left the menu while they were in the cart, until dismissed. */
  dropped: string[];
  quantityOf: (itemId: string) => number;
  setQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
  dismissDropped: () => void;
}

/**
 * One venue's cart: kept in localStorage under the venue id, and held against
 * the menu as it is NOW — a dish that left the menu or went unavailable drops
 * out, and its name is kept so the guest can be told. The total is display
 * only; the server prices the order again from its own menu.
 */
export function useFoodCart(venueId: string, menu: ReadonlyArray<VenueFoodItem>, discountPct: number): FoodCart {
  const { t } = useTranslation();
  const [stored, setStored] = useState<FoodCartQuantities>(() => readFoodCart(venueId));
  const [dropped, setDropped] = useState<string[]>([]);

  // What is shown is always the reconciled cart, so a stale entry never
  // reaches the screen even on the render before the effect below tidies it.
  const reconciled = useMemo(() => reconcileFoodCart(stored, menu), [stored, menu]);

  useEffect(() => {
    if (!reconciled.changed) return;
    setStored(reconciled.cart);
    if (reconciled.dropped.length) setDropped((prev) => [...new Set([...prev, ...reconciled.dropped])]);
  }, [reconciled]);

  useEffect(() => {
    writeFoodCart(venueId, reconciled.cart);
  }, [venueId, reconciled.cart]);

  const lines = useMemo(
    () =>
      menu.flatMap((item) => {
        const quantity = reconciled.cart[item.id];
        return quantity ? [{ item, quantity }] : [];
      }),
    [menu, reconciled.cart],
  );
  const price = useMemo(
    () => priceFoodCart(lines.map((line) => ({ unit_price: line.item.price, quantity: line.quantity })), discountPct),
    [lines, discountPct],
  );
  const signature = useMemo(() => lines.map((line) => `${line.item.id}:${line.quantity}`).join('|'), [lines]);

  const quantityOf = useCallback((itemId: string) => reconciled.cart[itemId] ?? 0, [reconciled.cart]);

  const setQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const next = Math.min(FOOD_ORDER_LIMITS.maxQuantity, Math.max(0, Math.floor(quantity)));
      const isNewLine = !(itemId in reconciled.cart);
      if (next > 0 && isNewLine && Object.keys(reconciled.cart).length >= FOOD_ORDER_LIMITS.maxLines) {
        notify(t('mweb.venueFood.maxLines', { vars: { max: String(FOOD_ORDER_LIMITS.maxLines) } }), 'warning');
        return;
      }
      setStored((prev) =>
        next > 0
          ? { ...prev, [itemId]: next }
          : Object.fromEntries(Object.entries(prev).filter(([id]) => id !== itemId)),
      );
    },
    [reconciled.cart, t],
  );

  const clear = useCallback(() => setStored({}), []);
  const dismissDropped = useCallback(() => setDropped([]), []);

  return { lines, price, signature, dropped, quantityOf, setQuantity, clear, dismissDropped };
}
