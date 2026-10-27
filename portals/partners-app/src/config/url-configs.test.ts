import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** The module read afresh, since it decides its URLs once at load time. */
const load = async () => (await import('./url-configs')).urlConfigs;

describe('urlConfigs', () => {
  it('points a dev server at the local graphql server and mWeb', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_MWEB_URL', '');
    expect(await load()).toEqual({
      isDevelopment: true,
      graphqlUrl: 'http://localhost:2001/graphql',
      mwebUrl: 'http://localhost:2003',
    });
  });

  it('points a production build at the production graphql server and mWeb', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_MWEB_URL', '');
    expect(await load()).toEqual({
      isDevelopment: false,
      graphqlUrl: 'https://server.duncit.com/graphql',
      mwebUrl: 'https://mweb.duncit.com',
    });
  });

  it('lets the environment override either URL', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('VITE_MWEB_URL', 'https://staging.mweb.duncit.com');
    const configs = await load();
    expect(configs.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(configs.mwebUrl).toBe('https://staging.mweb.duncit.com');
  });
});
