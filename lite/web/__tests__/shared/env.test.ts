import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** shared/env reads import.meta.env once, at import, so each case loads a fresh copy. */
const load = async () => import('../../../shared/env');

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_LITE_GRAPHQL_URL', '');
  vi.stubEnv('VITE_LITE_SITE_URL', '');
  vi.stubEnv('VITE_LITE_PORTAL_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('shared/env', () => {
  it('talks to the same-origin API and the local dev hosts when nothing is configured in development', async () => {
    vi.stubEnv('PROD', false);
    const env = await load();
    expect(env.GRAPHQL_URL).toBe('/graphql');
    expect(env.SITE_URL).toBe('http://localhost:2041');
    expect(env.PORTAL_URL).toBe('http://portal.localhost:2041');
  });

  it('falls back to the production hostnames in a production build', async () => {
    vi.stubEnv('PROD', true);
    const env = await load();
    expect(env.SITE_URL).toBe('https://lite.duncit.com');
    expect(env.PORTAL_URL).toBe('https://lite-portal.duncit.com');
  });

  it('uses configured values, trimmed and without trailing slashes', async () => {
    vi.stubEnv('VITE_LITE_GRAPHQL_URL', '  https://api.lite.example/graphql ');
    vi.stubEnv('VITE_LITE_SITE_URL', ' https://lite.example/// ');
    vi.stubEnv('VITE_LITE_PORTAL_URL', 'https://console.lite.example/');
    const env = await load();
    expect(env.GRAPHQL_URL).toBe('https://api.lite.example/graphql');
    expect(env.SITE_URL).toBe('https://lite.example');
    expect(env.PORTAL_URL).toBe('https://console.lite.example');
  });

  it('treats a blank value as unset', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_LITE_GRAPHQL_URL', '   ');
    vi.stubEnv('VITE_LITE_SITE_URL', '   ');
    const env = await load();
    expect(env.GRAPHQL_URL).toBe('/graphql');
    expect(env.SITE_URL).toBe('http://localhost:2041');
  });

  it('keeps separate storage slots for the app and the console', async () => {
    const { APP_KEY, STORAGE_KEYS } = await load();
    expect(APP_KEY).toBe('lite');
    expect(new Set(Object.values(STORAGE_KEYS)).size).toBe(Object.keys(STORAGE_KEYS).length);
    expect(STORAGE_KEYS.token).not.toBe(STORAGE_KEYS.portalToken);
  });
});
