import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * landing.ts is mostly the site's photographs and layout, but `partnerLanding`
 * memoises one translator fetch for the whole static build — every component
 * awaits the same promise in its frontmatter, so re-fetching per component
 * would multiply one request by the page count.
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

describe('partnerLanding', () => {
  it('builds the landing content from the catalogue', async () => {
    const { partnerLanding } = await import('./landing');
    const landing = await partnerLanding();

    expect(landing.pillars.map((p) => p.title)).toEqual([
      'website.partners.ways.venueTitle',
      'website.partners.ways.hostTitle',
      'website.partners.ways.earningsTitle',
    ]);
    expect(landing.stats.map((s) => s.value)).toEqual(['24h', '0', '2']);
  });

  it('asks the API the site is configured against', async () => {
    const { urlConfigs } = await import('./url-configs');
    const { partnerLanding } = await import('./landing');
    await partnerLanding();

    expect(getSiteTranslator).toHaveBeenCalledWith(urlConfigs.graphqlUrl);
  });

  it('requests the catalogue ONCE however many components ask for it', async () => {
    const { partnerLanding } = await import('./landing');

    const [first, second] = await Promise.all([partnerLanding(), partnerLanding()]);
    const third = await partnerLanding();

    expect(getSiteTranslator).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('serves its photography at a bounded width', async () => {
    const { partnerLanding } = await import('./landing');
    const landing = await partnerLanding();

    // Unsplash originals are several megabytes; both images go through the
    // resizer with an explicit width.
    expect(landing.heroImage).toContain('w=1800');
    expect(landing.proofImage).toContain('w=1200');
  });
});
