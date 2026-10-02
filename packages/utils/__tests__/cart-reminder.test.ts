import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CART_NUDGE_SETTINGS,
  addToWishlist,
  canShowCartNudge,
  cartNudgeDelayMs,
  cartNudgeHideMs,
  removeFromWishlist,
  toCartSyncLines,
  wishlistKey,
} from '../src/cart-reminder';

const settings = DEFAULT_CART_NUDGE_SETTINGS;
const base = { settings, itemCount: 2, muted: false, snoozed: false, route: '/home' };

describe('cart nudge timing', () => {
  it('turns the minutes and seconds settings into milliseconds', () => {
    expect(cartNudgeDelayMs(settings)).toBe(600_000);
    expect(cartNudgeHideMs(settings)).toBe(8000);
  });

  it('never schedules a zero wait', () => {
    const zero = { ...settings, nudge_delay_minutes: 0, nudge_auto_hide_seconds: 0 };
    expect(cartNudgeDelayMs(zero)).toBe(60_000);
    expect(cartNudgeHideMs(zero)).toBe(1000);
  });
});

describe('canShowCartNudge', () => {
  it('shows when the cart holds something and nothing holds it back', () => {
    expect(canShowCartNudge(base)).toBe(true);
  });

  it('stays away when switched off, empty, muted or snoozed', () => {
    expect(canShowCartNudge({ ...base, settings: { ...settings, nudge_enabled: false } })).toBe(false);
    expect(canShowCartNudge({ ...base, itemCount: 0 })).toBe(false);
    expect(canShowCartNudge({ ...base, muted: true })).toBe(false);
    expect(canShowCartNudge({ ...base, snoozed: true })).toBe(false);
  });

  it('stays away on the cart and checkout, on both route spellings', () => {
    expect(canShowCartNudge({ ...base, route: '/cart' })).toBe(false);
    expect(canShowCartNudge({ ...base, route: 'ProductCheckout' })).toBe(false);
  });
});

describe('wishlist', () => {
  const tee = { pod_id: 'pod-1', product_id: 'p-7', variant_id: 'xl' };
  const mug = { pod_id: 'pod-1', product_id: 'p-9', variant_id: '' };

  it('keys an entry by pod, product and variant', () => {
    expect(wishlistKey(tee)).toBe('pod-1:p-7:xl');
  });

  it('adds newest first and never twice', () => {
    expect(addToWishlist([mug], tee)).toEqual([tee, mug]);
    expect(addToWishlist([mug, tee], tee)).toEqual([tee, mug]);
  });

  it('removes by key', () => {
    expect(removeFromWishlist([tee, mug], wishlistKey(tee))).toEqual([mug]);
  });
});

describe('toCartSyncLines', () => {
  it('sends ids and quantity only', () => {
    const line = { ...tee(), quantity: 2, product_name: 'Tee', unit_cost: 499 };
    expect(toCartSyncLines([line])).toEqual([
      { pod_id: 'pod-1', product_id: 'p-7', variant_id: 'xl', quantity: 2 },
    ]);
  });
});

function tee() {
  return { pod_id: 'pod-1', product_id: 'p-7', variant_id: 'xl' };
}
