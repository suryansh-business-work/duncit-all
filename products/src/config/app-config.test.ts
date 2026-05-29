import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Products app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('products');
    expect(appConfig.name).toBe('Products');
    expect(appConfig.fullName).toBe('Duncit Products');
    expect(appConfig.tokenKey).toBe('products_token');
  });

  it('gates on the PRODUCTS_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('PRODUCTS_MANAGER');
  });

  it('exposes the inventory and ecomm nav entries', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(
      expect.arrayContaining(['/', '/inventory', '/ecomm/product-requests']),
    );
  });
});
