import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit Ads app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('ads');
    expect(appConfig.name).toBe('Ads');
    expect(appConfig.fullName).toBe('Duncit Ads');
    expect(appConfig.tokenKey).toBe('ads_token');
    expect(appConfig.colorModeKey).toBe('ads_color_mode');
  });

  it('gates on the ADS_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['ADS_MANAGER']);
  });

  it('falls back to the default login image when none is configured', () => {
    // VITE_LOGIN_IMAGE is unset in the test env, so the literal fallback is used.
    expect(appConfig.loginImage).toContain('pexels.com');
  });

  it('exposes a Dashboard nav entry and a nested Create Ads group', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toContain('/');
    const createGroup = appConfig.nav.find((n) => n.label === 'Create Ads');
    expect(createGroup?.children?.map((c) => c.to)).toEqual(['/ads', '/ads/new']);
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'ADS_USER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.example.com/login.png');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['ADS_USER', 'SUPER_ADMIN']);
    expect(mod.appConfig.loginImage).toBe('https://cdn.example.com/login.png');
  });
});
