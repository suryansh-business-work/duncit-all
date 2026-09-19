import { afterEach, describe, expect, it, vi } from 'vitest';

/** The URLs are read once, at import time, so each case re-evaluates the module. */
const loadUrls = async () => {
  vi.resetModules();
  return (await import('../../../src/config/url-configs')).urlConfigs;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('urlConfigs', () => {
  it('points a dev build at the local server and console', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_APP_URL', '');
    const urls = await loadUrls();
    expect(urls.isDevelopment).toBe(true);
    expect(urls.graphqlUrl).toBe('http://localhost:2001/graphql');
    expect(urls.appUrl).toBe('http://localhost:2029');
  });

  it('points a production build at the live server and console', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_APP_URL', '');
    const urls = await loadUrls();
    expect(urls.isDevelopment).toBe(false);
    expect(urls.graphqlUrl).toBe('https://server.duncit.com/graphql');
    expect(urls.appUrl).toBe('https://regional-club-admin.duncit.com');
  });

  it('lets the environment override both URLs', async () => {
    vi.stubEnv('VITE_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('VITE_APP_URL', 'https://staging.regional-club-admin.duncit.com');
    const urls = await loadUrls();
    expect(urls.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(urls.appUrl).toBe('https://staging.regional-club-admin.duncit.com');
  });
});
