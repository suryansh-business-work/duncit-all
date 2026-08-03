import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const flattenNav = (items: typeof appConfig.nav = appConfig.nav): typeof appConfig.nav =>
  items.flatMap((item) => [item, ...flattenNav(item.children ?? [])]);

describe('Duncit Products app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('products');
    expect(appConfig.name).toBe('Products');
    expect(appConfig.fullName).toBe('Duncit Products');
    expect(appConfig.tokenKey).toBe('products_token');
    expect(appConfig.colorModeKey).toBe('products_color_mode');
  });

  it('gates on the PRODUCTS_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('PRODUCTS_MANAGER');
  });

  it('carries the brand accent used by the shared shell', () => {
    expect(appConfig.accent.main).toBe('#ea580c');
  });

  it('falls back to the default login image when none is configured', () => {
    expect(appConfig.loginImage).toContain('pexels.com');
  });

  it('exposes the inventory, ecomm and orders nav entries', () => {
    const targets = flattenNav()
      .map((n) => n.to)
      .filter(Boolean);
    expect(targets).toEqual(
      expect.arrayContaining([
        '/',
        '/inventory',
        '/catalog/brands',
        '/ecomm/product-requests',
        '/ecomm/brands',
        '/orders',
        '/settings/warehouses',
      ]),
    );
  });

  it('keeps the catalogue and the review inbox in separate nav sections', () => {
    const catalog = appConfig.nav.find((item) => item.label === 'Catalog');
    expect(catalog?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Duncit Products', '/inventory'],
      ['Brands', '/catalog/brands'],
    ]);
    const review = appConfig.nav.find((item) => item.label === 'Brands & Products Review');
    expect(review?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Brands Review', '/ecomm/brands'],
      ['Products Reviews', '/ecomm/product-requests'],
    ]);
    // The change-request pages are a different feature and stay put.
    const requests = appConfig.nav.find((item) => item.label === 'Ecomm Requests');
    expect(requests?.children?.map((c) => c.to)).toEqual([
      '/ecomm/brand-request',
      '/ecomm/product-request',
    ]);
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'PRODUCTS_MANAGER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.example.com/login.png');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['PRODUCTS_MANAGER', 'SUPER_ADMIN']);
    expect(mod.appConfig.loginImage).toBe('https://cdn.example.com/login.png');
  });
});
