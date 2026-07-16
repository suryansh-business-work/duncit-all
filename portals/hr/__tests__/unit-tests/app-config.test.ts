import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit HR app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('hr');
    expect(appConfig.name).toBe('HR');
    expect(appConfig.fullName).toBe('Duncit HR');
    expect(appConfig.tokenKey).toBe('hr_token');
    expect(appConfig.colorModeKey).toBe('hr_color_mode');
  });

  it('gates on the HR_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['HR_MANAGER']);
  });

  it('falls back to the default login image when none is configured', () => {
    // VITE_LOGIN_IMAGE is unset in the test env, so the literal fallback is used.
    expect(appConfig.loginImage).toContain('pexels.com');
  });

  it('exposes a single Dashboard nav entry', () => {
    expect(appConfig.nav.map((n) => n.to)).toEqual(['/']);
    expect(appConfig.nav[0].label).toBe('Dashboard');
    expect(appConfig.nav[0].icon).toBe('dashboard');
  });

  it('ships with no dashboard modules by default', () => {
    expect(appConfig.modules).toEqual([]);
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'HR_USER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.example.com/login.png');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['HR_USER', 'SUPER_ADMIN']);
    expect(mod.appConfig.loginImage).toBe('https://cdn.example.com/login.png');
  });
});
