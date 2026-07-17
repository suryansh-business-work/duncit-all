import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

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
    const flatten = (items: typeof appConfig.nav): typeof appConfig.nav =>
      items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
    const targets = flatten(appConfig.nav)
      .map((n) => n.to)
      .filter(Boolean);
    expect(targets).toEqual(
      expect.arrayContaining([
        '/',
        '/inventory',
        '/ecomm/product-requests',
        '/ecomm/brands',
        '/orders',
      ]),
    );
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
