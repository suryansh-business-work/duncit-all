import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit Website app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('website-app');
    expect(appConfig.name).toBe('Website');
    expect(appConfig.fullName).toBe('Duncit Website');
    expect(appConfig.tokenKey).toBe('website_app_token');
    expect(appConfig.colorModeKey).toBe('website_app_color_mode');
  });

  it('gates on the WEBSITE_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['WEBSITE_MANAGER']);
  });

  it('falls back to the default login image when none is configured', () => {
    // VITE_LOGIN_IMAGE is unset in the test env, so the literal fallback is used.
    expect(appConfig.loginImage).toContain('pexels.com');
  });

  it('exposes the full website-management nav', () => {
    const targets = appConfig.nav.flatMap((n) => ('children' in n ? n.children.map((c) => c.to) : [n.to]));
    expect(targets).toEqual([
      '/',
      '/careers',
      '/newsroom',
      '/blog',
      '/newsletter',
      '/contact-submissions',
      '/job-applications',
      '/navigation',
      '/reels',
      '/reels/settings',
    ]);
    expect(appConfig.nav.find((n) => 'to' in n && n.to === '/')?.label).toBe('Dashboard');
  });

  it('groups the reel pages under one Reel Slider entry with no route of its own', () => {
    const group = appConfig.nav.find((n) => n.label === 'Reel Slider');
    expect(group).toBeDefined();
    expect(group && 'to' in group).toBe(false);
    expect(group && 'children' in group ? group.children.map((c) => c.label) : []).toEqual([
      'Reels',
      'Reel Slider Settings',
    ]);
  });

  it('carries a brand accent and no extra modules', () => {
    expect(appConfig.accent.main).toBe('#2563eb');
    expect(appConfig.modules).toEqual([]);
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'WEBSITE_MANAGER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.example.com/login.png');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['WEBSITE_MANAGER', 'SUPER_ADMIN']);
    expect(mod.appConfig.loginImage).toBe('https://cdn.example.com/login.png');
  });
});
