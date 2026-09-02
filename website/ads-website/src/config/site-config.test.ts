import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Most of site-config is a content manifest, but the top of it is not: three
 * URLs each fall back to a local target or a production one depending on the
 * environment, and `siteContent()` memoises a single translator fetch for the
 * whole build. Those are the parts a wrong answer would actually break — the
 * file's own comment is about environments leaking into each other — so they
 * are what this covers.
 */

const getSiteTranslator = vi.fn();

vi.mock('@duncit/brand/site-i18n', () => ({
  getSiteTranslator: (url: string) => getSiteTranslator(url),
}));

/** The translator returns the key, so a missing key is visible rather than blank. */
const echoTranslator = { t: (key: string) => key };

beforeEach(() => {
  vi.resetModules();
  getSiteTranslator.mockReset();
  getSiteTranslator.mockResolvedValue(echoTranslator);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the environment the site talks to', () => {
  it('points at local services when Astro is running a dev server', async () => {
    vi.stubEnv('DEV', true);
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.isDevelopment).toBe(true);
    expect(siteUrls.portalUrl).toBe('http://localhost:2006');
    expect(siteUrls.graphqlUrl).toBe('http://localhost:2001/graphql');
    expect(siteUrls.mainSiteUrl).toBe('http://localhost:2000');
  });

  it('points at production services for a normal build', async () => {
    vi.stubEnv('DEV', false);
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.isDevelopment).toBe(false);
    expect(siteUrls.portalUrl).toBe('https://ads-portal.duncit.com');
    expect(siteUrls.graphqlUrl).toBe('https://server.duncit.com/graphql');
    expect(siteUrls.mainSiteUrl).toBe('https://duncit.com');
  });

  it('forces the dev targets for a built preview via PUBLIC_IS_DEVELOPMENT', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PUBLIC_IS_DEVELOPMENT', 'true');
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.isDevelopment).toBe(true);
    expect(siteUrls.portalUrl).toBe('http://localhost:2006');
  });

  it('lets an explicit env var win over both defaults', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('PUBLIC_ADS_PORTAL_URL', 'https://staging.ads-portal.duncit.com');
    vi.stubEnv('PUBLIC_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('PUBLIC_MAIN_SITE_URL', 'https://staging.duncit.com');
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.portalUrl).toBe('https://staging.ads-portal.duncit.com');
    expect(siteUrls.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(siteUrls.mainSiteUrl).toBe('https://staging.duncit.com');
  });
});

describe('siteContent', () => {
  it('builds the site from the catalogue, and asks the API it was pointed at', async () => {
    vi.stubEnv('DEV', false);
    const { siteContent, siteUrls } = await import('./site-config');
    const content = await siteContent();

    expect(getSiteTranslator).toHaveBeenCalledWith(siteUrls.graphqlUrl);
    expect(content.brand.name).toBe('website.ads.brand.name');
    expect(content.nav.links).toHaveLength(5);
  });

  it('sends every advertiser CTA to the resolved portal', async () => {
    vi.stubEnv('DEV', false);
    const { siteContent } = await import('./site-config');
    const content = await siteContent();

    // Signing up to advertise IS opening the portal — if these ever diverge
    // from portalUrl, a dev build starts linking people at production.
    expect(content.nav.login.href).toBe('https://ads-portal.duncit.com');
    expect(content.nav.signup.href).toBe('https://ads-portal.duncit.com');
    expect(content.hero.primaryCta.href).toBe('https://ads-portal.duncit.com');
  });

  it('requests the catalogue ONCE however many components ask for it', async () => {
    const { siteContent } = await import('./site-config');

    const [first, second] = await Promise.all([siteContent(), siteContent()]);
    const third = await siteContent();

    // A static build renders every page in one process, and each component
    // awaits this same promise in its frontmatter. Re-fetching per component
    // would multiply one request by the whole page count.
    expect(getSiteTranslator).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('serves imagery through the Pexels resizer rather than originals', async () => {
    const { siteContent } = await import('./site-config');
    const content = await siteContent();

    expect(JSON.stringify(content)).toContain('auto=compress');
  });
});
