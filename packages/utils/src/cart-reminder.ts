/**
 * The Pod Shop cart's reminders and wishlist — the rules mWeb and the native
 * app both apply (CLAUDE.md rules 29 + 56). Only the rules live here: the
 * nudge is drawn with MUI on mWeb and Tamagui on native, and each app stores
 * its own lists.
 *
 * Timing comes from Products portal > Cart > Cart Settings
 * (`productCartSettings`); the defaults below are what the server seeds, used
 * until that answer arrives or when it cannot be read.
 */
import { isCartFlowRoute } from './cart-entry';

export interface CartNudgeSettings {
  nudge_enabled: boolean;
  nudge_delay_minutes: number;
  nudge_auto_hide_seconds: number;
}

export const DEFAULT_CART_NUDGE_SETTINGS: CartNudgeSettings = {
  nudge_enabled: true,
  nudge_delay_minutes: 10,
  nudge_auto_hide_seconds: 8,
};

/** Every bounded Cart Setting. The server clamps to the same ranges. */
export const CART_SETTINGS_BOUNDS = {
  nudge_delay_minutes: { min: 1, max: 1440 },
  nudge_auto_hide_seconds: { min: 3, max: 60 },
  email_first_delay_hours: { min: 1, max: 720 },
  email_repeat_hours: { min: 1, max: 720 },
  email_max_count: { min: 1, max: 20 },
} as const;

/** Device flag for "Don't remind me again". */
export const CART_NUDGE_MUTED_KEY = 'duncit.cart_nudge_muted';

/** How long to wait before the next nudge — after launch and after each one. */
export const cartNudgeDelayMs = (settings: CartNudgeSettings): number =>
  Math.max(1, settings.nudge_delay_minutes) * 60_000;

/** How long a nudge stays up before it hides itself. */
export const cartNudgeHideMs = (settings: CartNudgeSettings): number =>
  Math.max(1, settings.nudge_auto_hide_seconds) * 1000;

export interface CartNudgeState {
  settings: CartNudgeSettings;
  /** Units in the cart. */
  itemCount: number;
  /** "Don't remind me again" on this device. */
  muted: boolean;
  /** "Remind me next time" — off for the rest of this app session. */
  snoozed: boolean;
  /** Web pathname or native route name the member is on. */
  route: string;
}

/** Whether a due nudge may show now. Never on the cart or a checkout — the
 * cart is already on screen there. */
export function canShowCartNudge(state: CartNudgeState): boolean {
  return (
    state.settings.nudge_enabled &&
    state.itemCount > 0 &&
    !state.muted &&
    !state.snoozed &&
    !isCartFlowRoute(state.route)
  );
}

/** What identifies a wishlist entry: the product (or variant) in one pod's shop. */
export interface WishlistKeyed {
  pod_id: string;
  product_id: string;
  variant_id: string;
}

export const wishlistKey = (item: WishlistKeyed): string =>
  `${item.pod_id}:${item.product_id}:${item.variant_id}`;

/** Add (or move to the top) one entry — newest first, never twice. */
export function addToWishlist<T extends WishlistKeyed>(items: readonly T[], item: T): T[] {
  const key = wishlistKey(item);
  return [item, ...items.filter((entry) => wishlistKey(entry) !== key)];
}

export function removeFromWishlist<T extends WishlistKeyed>(
  items: readonly T[],
  key: string,
): T[] {
  return items.filter((entry) => wishlistKey(entry) !== key);
}

export interface CartSyncLine extends WishlistKeyed {
  quantity: number;
}

/** The ids-and-quantities snapshot `syncMyProductCart` takes — nothing else of
 * a line leaves the device. */
export const toCartSyncLines = (lines: readonly CartSyncLine[]): CartSyncLine[] =>
  lines.map(({ pod_id, product_id, variant_id, quantity }) => ({
    pod_id,
    product_id,
    variant_id,
    quantity,
  }));
