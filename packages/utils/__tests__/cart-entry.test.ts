import { describe, expect, it } from 'vitest';

import {
  CART_BADGE_MAX,
  cartBadgeLabel,
  deriveCartEntry,
  isCartFlowRoute,
} from '../src/cart-entry';

describe('isCartFlowRoute', () => {
  it('matches the cart flow by native screen name', () => {
    expect(isCartFlowRoute('Cart')).toBe(true);
    expect(isCartFlowRoute('Checkout')).toBe(true);
    expect(isCartFlowRoute('ProductCheckout')).toBe(true);
  });

  it('matches the same flow by web pathname, params and all', () => {
    expect(isCartFlowRoute('/cart')).toBe(true);
    expect(isCartFlowRoute('/product-checkout')).toBe(true);
    expect(isCartFlowRoute('/checkout/pod-1')).toBe(true);
  });

  it('leaves every other route alone — including the shop', () => {
    expect(isCartFlowRoute('Shop')).toBe(false);
    expect(isCartFlowRoute('/shop')).toBe(false);
    expect(isCartFlowRoute('/home')).toBe(false);
    expect(isCartFlowRoute('')).toBe(false);
  });
});

describe('cartBadgeLabel', () => {
  it('prints the count up to the cap and collapses beyond it', () => {
    expect(cartBadgeLabel(0)).toBe('0');
    expect(cartBadgeLabel(5)).toBe('5');
    expect(cartBadgeLabel(CART_BADGE_MAX)).toBe('99');
    expect(cartBadgeLabel(CART_BADGE_MAX + 1)).toBe('99+');
    expect(cartBadgeLabel(150)).toBe('99+');
  });
});

describe('deriveCartEntry', () => {
  it('hides the entry point when the cart is empty', () => {
    expect(deriveCartEntry(0, '/home').visible).toBe(false);
    expect(deriveCartEntry(0, 'Home').visible).toBe(false);
  });

  it('hides the entry point on the cart flow even with items', () => {
    expect(deriveCartEntry(3, '/cart').visible).toBe(false);
    expect(deriveCartEntry(3, 'ProductCheckout').visible).toBe(false);
  });

  // The accessible name is the caller's: both header buttons render
  // `mweb.cart.open` with this count, so no copy is derived here (rule 38).
  it('shows count and badge when there is something to open', () => {
    expect(deriveCartEntry(5, '/home')).toEqual({
      visible: true,
      count: 5,
      badge: '5',
    });
  });

  it('shows on the shop, where the header cart now lives too', () => {
    expect(deriveCartEntry(2, 'Shop').visible).toBe(true);
    expect(deriveCartEntry(2, '/shop').visible).toBe(true);
  });
});
