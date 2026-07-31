import {
  SHORT_CODE_PATTERN,
  buildDestination,
  generateShortCode,
  utmSlug,
} from '../../shortLink.codes';
import { mediumUtm, shortLinkOptions, sourceUtm } from '../../shortLink.options';
import { shortLinkResolvers } from '../../shortLink.resolver';
import { makeContext } from '@test/harness';

describe('generateShortCode', () => {
  // The shape is what stops a code shadowing a real website path — the nginx
  // apex carve-out matches exactly this pattern.
  it('always produces a code the apex regex will route', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(SHORT_CODE_PATTERN);
    }
  });

  it('does not park the guaranteed characters in fixed positions', () => {
    const digitPositions = new Set<number>();
    for (let i = 0; i < 200; i += 1) {
      const code = generateShortCode();
      digitPositions.add(code.search(/\d/));
    }
    expect(digitPositions.size).toBeGreaterThan(1);
  });

  it('rejects anything a real website path looks like', () => {
    for (const path of ['about', 'contact', 'careers', 'partners', 'aboutus1', 'ABOUTUS']) {
      expect(SHORT_CODE_PATTERN.test(path)).toBe(false);
    }
  });
});

describe('buildDestination', () => {
  const tags = { code: 'aB3xY9Zq', utm_source: 'instagram', utm_medium: 'social' };

  it('tags the destination and marks which link sent the visitor', () => {
    const url = new URL(
      buildDestination('https://mweb.duncit.com/club/c1/pod/p1', {
        ...tags,
        utm_campaign: 'badminton_launch',
      }),
    );
    expect(url.searchParams.get('utm_source')).toBe('instagram');
    expect(url.searchParams.get('utm_medium')).toBe('social');
    expect(url.searchParams.get('utm_campaign')).toBe('badminton_launch');
    // dl is what makes two links for the same campaign on the same channel
    // tellable apart — utm alone cannot do it.
    expect(url.searchParams.get('dl')).toBe('aB3xY9Zq');
  });

  it('omits the campaign tag when the link belongs to no campaign', () => {
    const url = new URL(buildDestination('https://mweb.duncit.com/', tags));
    expect(url.searchParams.has('utm_campaign')).toBe(false);
  });

  // A marketer who pasted a pre-tagged URL meant it.
  it('leaves a param the destination already carries alone', () => {
    const url = new URL(
      buildDestination('https://mweb.duncit.com/?utm_source=partner_site', tags),
    );
    expect(url.searchParams.get('utm_source')).toBe('partner_site');
    expect(url.searchParams.get('utm_medium')).toBe('social');
  });

  it('keeps the destination path and its own query intact', () => {
    const url = new URL(buildDestination('https://mweb.duncit.com/shop?q=bat', tags));
    expect(url.pathname).toBe('/shop');
    expect(url.searchParams.get('q')).toBe('bat');
  });
});

describe('utmSlug', () => {
  it('produces analytics-safe values', () => {
    expect(utmSlug('X (Twitter)')).toBe('x_twitter');
    expect(utmSlug('Google Ads')).toBe('google_ads');
    expect(utmSlug('  Referral Partner  ')).toBe('referral_partner');
    expect(utmSlug('QR Code')).toBe('qr_code');
    expect(utmSlug('!!!')).toBe('');
  });
});

describe('shortLinkOptions', () => {
  it('offers every channel and medium with a derived utm value', () => {
    const options = shortLinkOptions();
    expect(options.sources).toHaveLength(20);
    expect(options.mediums).toHaveLength(21);
    const instagram = options.sources.find((option) => option.value === 'INSTAGRAM');
    expect(instagram).toEqual({
      value: 'INSTAGRAM',
      label: 'Instagram',
      utm_value: 'instagram',
      requires_text: false,
    });
  });

  it('marks Other as needing free text and gives it no utm value of its own', () => {
    const other = shortLinkOptions().sources.find((option) => option.value === 'OTHER');
    expect(other?.requires_text).toBe(true);
    expect(other?.utm_value).toBe('');
  });

  it('slugs the free text for Other, and the label otherwise', () => {
    expect(sourceUtm('OTHER', 'Campus Ambassador')).toBe('campus_ambassador');
    expect(sourceUtm('X_TWITTER')).toBe('x_twitter');
    expect(mediumUtm('OTHER', 'Print Flyer')).toBe('print_flyer');
    expect(mediumUtm('ORGANIC_SOCIAL')).toBe('organic_social');
    expect(sourceUtm('OTHER', null)).toBe('');
  });
});

describe('shortLink resolvers', () => {
  const denied = /access denied/i;

  it('gates every query and mutation to the marketing roles', async () => {
    const ctx = makeContext({ roles: ['USER'] });
    const calls = [
      () => (shortLinkResolvers.Query as any).shortLinkOptions({}, {}, ctx),
      () => (shortLinkResolvers.Query as any).shortLinksTable({}, {}, ctx),
      () => (shortLinkResolvers.Query as any).shortLink({}, { id: 'x' }, ctx),
      () => (shortLinkResolvers.Query as any).shortLinkQr({}, { id: 'x' }, ctx),
      () => (shortLinkResolvers.Query as any).shortLinkFunnel({}, { id: 'x' }, ctx),
      () => (shortLinkResolvers.Query as any).shortLinkJourneys({}, { id: 'x' }, ctx),
      () => (shortLinkResolvers.Mutation as any).createShortLink({}, { input: {} }, ctx),
      () =>
        (shortLinkResolvers.Mutation as any).setShortLinkActive(
          {},
          { id: 'x', is_active: false },
          ctx,
        ),
      () => (shortLinkResolvers.Mutation as any).deleteShortLink({}, { id: 'x' }, ctx),
    ];
    for (const call of calls) {
      await expect((async () => call())()).rejects.toThrow(denied);
    }
  });

  it('lets a marketing manager read the options', async () => {
    const ctx = makeContext({ roles: ['MARKETING_MANAGER'] });
    const options = await (shortLinkResolvers.Query as any).shortLinkOptions({}, {}, ctx);
    expect(options.sources.length).toBeGreaterThan(0);
  });
});
