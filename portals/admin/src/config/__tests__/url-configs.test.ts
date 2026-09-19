import { afterEach, describe, expect, it, vi } from 'vitest';

/** The module reads import.meta.env once at load, so each case imports it afresh. */
const loadUrlConfigs = async () => {
  vi.resetModules();
  return (await import('../url-configs')).urlConfigs;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('urlConfigs', () => {
  it('points a production build at the production server and mWeb', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_MWEB_URL', '');

    const urls = await loadUrlConfigs();

    expect(urls).toEqual({
      isDevelopment: false,
      graphqlUrl: 'https://server.duncit.com/graphql',
      mwebUrl: 'https://mweb.duncit.com',
    });
  });

  it('points local development at localhost', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    vi.stubEnv('VITE_MWEB_URL', '');

    const urls = await loadUrlConfigs();

    expect(urls).toEqual({
      isDevelopment: true,
      graphqlUrl: 'http://localhost:2001/graphql',
      mwebUrl: 'http://localhost:2003',
    });
  });

  it('lets VITE_GRAPHQL_URL / VITE_MWEB_URL override either default', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('VITE_MWEB_URL', 'https://staging.mweb.duncit.com');

    const urls = await loadUrlConfigs();

    expect(urls.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(urls.mwebUrl).toBe('https://staging.mweb.duncit.com');
  });
});
