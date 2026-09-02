import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * site-config is mostly a content manifest, but the top of it is not: three
 * URLs each fall back to a local target or a production one depending on the
 * environment, and `siteContent()` memoises a single translator fetch for the
 * whole build. Those are the parts a wrong answer would actually break — a dev
 * server silently pointing at the production API is exactly the failure the
 * file's own comment warns about — so they are what this covers.
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
    expect(siteUrls.mwebUrl).toBe('http://localhost:2003');
    expect(siteUrls.graphqlUrl).toBe('http://localhost:2001/graphql');
    expect(siteUrls.mainSiteUrl).toBe('http://localhost:2000');
  });

  it('points at production services for a normal build', async () => {
    vi.stubEnv('DEV', false);
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.isDevelopment).toBe(false);
    expect(siteUrls.mwebUrl).toBe('https://mweb.duncit.com');
    expect(siteUrls.graphqlUrl).toBe('https://server.duncit.com/graphql');
    expect(siteUrls.mainSiteUrl).toBe('https://duncit.com');
  });

  it('forces the dev targets for a built preview via PUBLIC_IS_DEVELOPMENT', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PUBLIC_IS_DEVELOPMENT', 'true');
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.isDevelopment).toBe(true);
    expect(siteUrls.mwebUrl).toBe('http://localhost:2003');
  });

  it('lets an explicit env var win over both defaults', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('PUBLIC_MWEB_URL', 'https://staging.mweb.duncit.com');
    vi.stubEnv('PUBLIC_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    vi.stubEnv('PUBLIC_MAIN_SITE_URL', 'https://staging.duncit.com');
    const { siteUrls } = await import('./site-config');

    expect(siteUrls.mwebUrl).toBe('https://staging.mweb.duncit.com');
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
    expect(content.brand.name).toBe('website.earn.brand.name');
    expect(content.nav.links).toHaveLength(5);
    expect(content.paths).toHaveLength(4);
    expect(content.calculator.roles.map((r) => r.key)).toEqual(['host', 'club_admin']);
  });

  it('carries the resolved URLs into the links it builds', async () => {
    vi.stubEnv('DEV', false);
    const { siteContent } = await import('./site-config');
    const content = await siteContent();

    expect(content.nav.login.href).toBe('https://mweb.duncit.com/login');
    expect(content.nav.links[0].href).toBe('https://duncit.com/about');
    expect(content.paths[0].href).toBe('https://mweb.duncit.com/survey/venue');
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

  it('serves the Pexels resizer rather than multi-megabyte originals', async () => {
    const { siteContent } = await import('./site-config');
    const content = await siteContent();

    // The hero is full-bleed so it asks for a desktop width; the cards do not.
    expect(content.hero.image).toContain('w=1920');
    expect(content.paths[0].image).toContain('w=800');
    expect(content.hero.image).toContain('auto=compress');
  });

  it('renders no screenshot strip until real product shots exist', async () => {
    const { siteContent } = await import('./site-config');
    const content = await siteContent();

    expect(content.screenshots.items).toEqual([]);
  });
});
