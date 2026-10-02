import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import {
  CART_NUDGE_MUTED_KEY,
  DEFAULT_CART_NUDGE_SETTINGS,
  canShowCartNudge,
  cartNudgeDelayMs,
  cartNudgeHideMs,
  type CartNudgeSettings,
} from '@duncit/utils';

import { MobileProductCartNudgeSettingsDocument } from '@/graphql/product-cart';
import { graphqlRequest } from '@/services/graphql.client';
import { getItem, setItem } from '@/services/secure-storage';
import { selectCartCount, useCartStore } from '@/stores/cart.store';

/** "Remind me next time" lasts as long as this app process — the next launch
 * is "next time". */
let snoozedThisLaunch = false;

/**
 * When the "your cart is calling" nudge is up. It comes due a set delay after
 * launch and again after each one hides (Products portal > Cart Settings).
 * "Remind me next time" snoozes it until the next launch; "Don't remind me
 * again" mutes it on this device. Twin of mWeb's useCartNudge.
 */
export function useCartNudge(route: string) {
  const lines = useCartStore((s) => s.lines);
  const totalCount = useCartStore(selectCartCount);
  const [settings, setSettings] = useState<CartNudgeSettings>(DEFAULT_CART_NUDGE_SETTINGS);
  const [due, setDue] = useState(false);
  // Muted until the saved flag says otherwise, so a slow read never flashes it.
  const [muted, setMuted] = useState(true);
  const [snoozed, setSnoozed] = useState(snoozedThisLaunch);
  const delayMs = cartNudgeDelayMs(settings);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileProductCartNudgeSettingsDocument)
      .then((data) => active && setSettings(data.productCartSettings))
      .catch((error: unknown) => logs.mobileApp.warn('cart', 'nudgeSettings', { error }));
    getItem(CART_NUDGE_MUTED_KEY)
      .then((value) => active && setMuted(value === '1'))
      .catch(() => active && setMuted(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (due) return undefined;
    const timer = setTimeout(() => setDue(true), delayMs);
    return () => clearTimeout(timer);
  }, [due, delayMs]);

  // Due on an empty cart: start over, so the first add is never met by a nudge.
  useEffect(() => {
    if (due && totalCount === 0) setDue(false);
  }, [due, totalCount]);

  const open = due && canShowCartNudge({ settings, itemCount: totalCount, muted, snoozed, route });

  const hide = useCallback(() => setDue(false), []);
  const later = useCallback(() => {
    snoozedThisLaunch = true;
    setSnoozed(true);
    setDue(false);
  }, []);
  const mute = useCallback(() => {
    setMuted(true);
    setDue(false);
    setItem(CART_NUDGE_MUTED_KEY, '1').catch((error: unknown) => {
      logs.mobileApp.warn('cart', 'nudgeFlag', { error });
    });
  }, []);

  return { open, lines, totalCount, hideMs: cartNudgeHideMs(settings), hide, later, mute };
}
