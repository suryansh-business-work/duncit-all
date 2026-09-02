import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Every cross-site link on the partner site goes through this map, so a wrong
 * answer here is how a dev build starts sending people at production (or the
 * reverse). Both environments and the explicit override are worth pinning.
 */

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('urlConfigs', () => {
  it('targets local services when Astro is running a dev server', async () => {
    vi.stubEnv('DEV', true);
    const { urlConfigs } = await import('./url-configs');

    expect(urlConfigs.isDevelopment).toBe(true);
    expect(urlConfigs.graphqlUrl).toBe('http://localhost:2001/graphql');
    expect(urlConfigs.siteUrl).toBe('http://localhost:2004');
    expect(urlConfigs.mainSiteUrl).toBe('http://localhost:2000');
    expect(urlConfigs.partnersAppUrl).toBe('http://localhost:2005');
  });

  it('targets production hosts for a normal build', async () => {
    vi.stubEnv('DEV', false);
    const { urlConfigs } = await import('./url-configs');

    expect(urlConfigs.isDevelopment).toBe(false);
    expect(urlConfigs.graphqlUrl).toBe('https://server.duncit.com/graphql');
    expect(urlConfigs.siteUrl).toBe('https://partners.duncit.com');
    expect(urlConfigs.mainSiteUrl).toBe('https://duncit.com');
    expect(urlConfigs.partnersAppUrl).toBe('https://partners-app.duncit.com');
  });

  it('forces the dev targets for a built preview via PUBLIC_IS_DEVELOPMENT', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PUBLIC_IS_DEVELOPMENT', 'true');
    const { urlConfigs } = await import('./url-configs');

    expect(urlConfigs.isDevelopment).toBe(true);
    expect(urlConfigs.siteUrl).toBe('http://localhost:2004');
  });

  it('lets an explicit env var win over both defaults', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('PUBLIC_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('PUBLIC_PARTNERS_SITE_URL', 'https://staging.partners.duncit.com');
    vi.stubEnv('PUBLIC_MAIN_SITE_URL', 'https://staging.duncit.com');
    vi.stubEnv('PUBLIC_PARTNERS_APP_URL', 'https://staging.partners-app.duncit.com');
    const { urlConfigs } = await import('./url-configs');

    expect(urlConfigs.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(urlConfigs.siteUrl).toBe('https://staging.partners.duncit.com');
    expect(urlConfigs.mainSiteUrl).toBe('https://staging.duncit.com');
    expect(urlConfigs.partnersAppUrl).toBe('https://staging.partners-app.duncit.com');
  });
});
