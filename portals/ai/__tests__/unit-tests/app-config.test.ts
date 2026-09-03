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

  it('lists two destinations and two groups, in that order', () => {
    expect(appConfig.nav.map((n) => n.label)).toEqual([
      'Welcome',
      'AI Library',
      'OpenAI',
      'AI Monitoring',
    ]);
  });

  it('gives every leaf a route and every group children instead', () => {
    // A group with a `to` would swallow the click that should open it, and a
    // leaf without one renders as dead chrome.
    const leaves = appConfig.nav.filter((n) => !n.children);
    const groups = appConfig.nav.filter((n) => n.children);

    expect(leaves.map((n) => n.to)).toEqual(['/', '/library']);
    expect(groups.every((n) => n.to === undefined)).toBe(true);
    expect(groups.flatMap((n) => n.children!.map((c) => c.to))).toEqual([
      '/openai',
      '/openai/logs',
      '/monitoring',
      '/monitoring/settings',
    ]);
  });

  it('names a localization key beside every label', () => {
    // Rule 38: the label is the fallback, the key is what the shell renders.
    const entries = appConfig.nav.flatMap((n) => [n, ...(n.children ?? [])]);
    expect(entries.every((n) => !!n.labelKey)).toBe(true);
  });

  it('describes the AI Library module first', () => {
    expect(appConfig.modules[0].title).toBe('AI Library');
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
