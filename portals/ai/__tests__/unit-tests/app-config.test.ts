import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit AI app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('ai');
    expect(appConfig.name).toBe('AI');
    expect(appConfig.fullName).toBe('Duncit AI');
    expect(appConfig.tokenKey).toBe('ai_token');
    expect(appConfig.colorModeKey).toBe('ai_color_mode');
  });

  it('gates on the AI_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['AI_MANAGER']);
  });

  it('falls back to the default login image when none is configured', () => {
    // VITE_LOGIN_IMAGE is unset in the test env, so the literal fallback is used.
    expect(appConfig.loginImage).toContain('pexels.com');
  });

  it('exposes a Welcome nav entry and an AI Library entry', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(['/', '/library']);
    expect(appConfig.nav.find((n) => n.to === '/')?.label).toBe('Welcome');
  });

  it('describes the Prompt Library module', () => {
    expect(appConfig.modules[0].title).toBe('Prompt Library');
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'AI_USER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.example.com/login.png');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['AI_USER', 'SUPER_ADMIN']);
    expect(mod.appConfig.loginImage).toBe('https://cdn.example.com/login.png');
  });
});
