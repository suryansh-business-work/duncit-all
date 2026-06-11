import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit Support app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('support');
    expect(appConfig.name).toBe('Support');
    expect(appConfig.fullName).toBe('Duncit Support');
    expect(appConfig.tokenKey).toBe('support_token');
    expect(appConfig.colorModeKey).toBe('support_color_mode');
  });

  it('gates on the SUPPORT_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['SUPPORT_MANAGER']);
  });

  it('exposes the five support sections including the dashboard root', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(['/', '/sos', '/callbacks', '/tickets', '/live-chat']);
    expect(appConfig.nav.find((n) => n.to === '/')?.label).toBe('Dashboard');
  });

  it('honours VITE_REQUIRED_ROLES when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'SUPPORT_USER, SUPER_ADMIN');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['SUPPORT_USER', 'SUPER_ADMIN']);
  });
});
