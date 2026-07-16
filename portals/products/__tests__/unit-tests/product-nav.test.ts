import { describe, expect, it } from 'vitest';
import { isProductNavItem } from '../../src/config/product-nav';

describe('isProductNavItem', () => {
  it('flags inventory, ecomm and orders routes as product-specific', () => {
    expect(isProductNavItem('/inventory')).toBe(true);
    expect(isProductNavItem('/inventory/new')).toBe(true);
    expect(isProductNavItem('/ecomm/brands')).toBe(true);
    expect(isProductNavItem('/orders/abc')).toBe(true);
  });

  it('treats the dashboard and unrelated routes as always-available', () => {
    expect(isProductNavItem('/')).toBe(false);
    expect(isProductNavItem('/profile')).toBe(false);
    expect(isProductNavItem('/login')).toBe(false);
  });
});
