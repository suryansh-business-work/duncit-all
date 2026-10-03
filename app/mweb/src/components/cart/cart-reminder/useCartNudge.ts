import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  CART_NUDGE_MUTED_KEY,
  DEFAULT_CART_NUDGE_SETTINGS,
  canShowCartNudge,
  cartNudgeDelayMs,
  cartNudgeHideMs,
  type CartNudgeSettings,
} from '@duncit/utils';
import { useCart } from '../CartContext';
import { PRODUCT_CART_NUDGE_SETTINGS } from './queries';

const readFlag = (storage: () => Storage): boolean => {
  try {
    return storage().getItem(CART_NUDGE_MUTED_KEY) === '1';
  } catch {
    return false; // Blocked storage — behave as never muted.
  }
};

const writeFlag = (storage: () => Storage) => {
  try {
    storage().setItem(CART_NUDGE_MUTED_KEY, '1');
  } catch (error) {
    logs.mWeb.warn('cart', 'nudgeFlag', { error });
  }
};

const local = () => localStorage;
const session = () => sessionStorage;

/**
 * When the "your cart is calling" nudge is up. It comes due a set delay after
 * launch and again after each one hides (Products portal > Cart Settings).
 * "Remind me next time" snoozes it for this browser session; "Don't remind me
 * again" mutes it on this device. Native twin: src/hooks/useCartNudge.ts.
 */
export function useCartNudge() {
  const { lines, totalCount } = useCart();
  const { pathname } = useLocation();
  const { data } = useQuery<{ productCartSettings: CartNudgeSettings }>(
    PRODUCT_CART_NUDGE_SETTINGS,
  );
  const settings = data?.productCartSettings ?? DEFAULT_CART_NUDGE_SETTINGS;
  const delayMs = cartNudgeDelayMs(settings);
  const [due, setDue] = useState(false);
  const [muted, setMuted] = useState(() => readFlag(local));
  // Session storage lives as long as the tab — "next time" is the next visit.
  const [snoozed, setSnoozed] = useState(() => readFlag(session));

  useEffect(() => {
    if (due) return undefined;
    const timer = setTimeout(() => setDue(true), delayMs);
    return () => clearTimeout(timer);
  }, [due, delayMs]);

  // Due on an empty cart: start over, so the first add is never met by a nudge.
  useEffect(() => {
    if (due && totalCount === 0) setDue(false);
  }, [due, totalCount]);

  const open =
    due &&
    canShowCartNudge({ settings, itemCount: totalCount, muted, snoozed, route: pathname });

  /** Hidden for now — due again after the delay. */
  const hide = useCallback(() => setDue(false), []);
  const later = useCallback(() => {
    writeFlag(session);
    setSnoozed(true);
    setDue(false);
  }, []);
  const mute = useCallback(() => {
    writeFlag(local);
    setMuted(true);
    setDue(false);
  }, []);

  return { open, lines, totalCount, hideMs: cartNudgeHideMs(settings), hide, later, mute };
}
