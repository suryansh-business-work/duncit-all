import express from 'express';
import request from 'supertest';
import { shortLinkService } from '../../shortLink.service';
import { shortLinkClickService } from '../../shortLinkClick.service';
import { buildShortLinkRouter } from '../../shortLink.router';
import { ShortLinkClickModel } from '../../shortLinkClick.model';

const base = {
  label: 'Diwali pod push',
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  source: 'INSTAGRAM' as const,
  medium: 'SOCIAL' as const,
};

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const newLink = () => shortLinkService.create(base, null);

const click = (
  linkId: string,
  code: string,
  over: Partial<Parameters<typeof shortLinkClickService.record>[0]> = {},
) =>
  shortLinkClickService.record({
    clickId: `c-${Math.random().toString(36).slice(2)}`,
    code,
    shortLinkId: linkId,
    referrer: 'https://www.instagram.com/p/1',
    userAgent: ANDROID_CHROME,
    forwardedFor: '103.21.244.0',
    ...over,
  });

describe('shortLinkClickService.record', () => {
  it('resolves the platform, device and location of a click', async () => {
    const link = await newLink();
    await click(link.id, link.code);

    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    expect(doc?.platform).toBe('Instagram');
    expect(doc?.referrer_host).toBe('instagram.com');
    expect(doc?.device_type).toBe('MOBILE');
    expect(doc?.os).toBe('Android');
    expect(doc?.browser).toBe('Chrome');
    expect(doc?.country).toBe('US');
    expect(doc?.city).toBeTruthy();
  });

  // The address is a personal identifier; the hash is enough to spot a repeat
  // visitor and useless for anything else.
  it('stores a hash of the address and never the address', async () => {
    const link = await newLink();
    await click(link.id, link.code);

    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    expect(doc?.ip_hash).toHaveLength(64);
    expect(doc?.ip_hash).not.toContain('103.21.244');
    expect(JSON.stringify(doc?.toObject())).not.toContain('103.21.244.0');
  });

  it('records a click that carries no referrer at all as Direct', async () => {
    const link = await newLink();
    await click(link.id, link.code, { referrer: null, userAgent: IPHONE_SAFARI });

    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    expect(doc?.platform).toBe('Direct');
    expect(doc?.referrer_host).toBeNull();
    expect(doc?.os).toBe('iOS');
  });
});

describe('shortLinkClickService.stats', () => {
  it('counts clicks, visitors and countries, and breaks them down', async () => {
    const link = await newLink();
    await click(link.id, link.code);
    await click(link.id, link.code);
    await click(link.id, link.code, {
      referrer: 'https://t.co/abc',
      userAgent: IPHONE_SAFARI,
      forwardedFor: '8.8.8.8',
    });

    const stats = await shortLinkClickService.stats(link.id);
    expect(stats.total_clicks).toBe(3);
    // Two of the three came from the same address.
    expect(stats.unique_visitors).toBe(2);
    expect(stats.countries_reached).toBe(1);

    expect(stats.platforms).toEqual([
      { label: 'Instagram', count: 2 },
      { label: 'X (Twitter)', count: 1 },
    ]);
    expect(stats.oses).toEqual([
      { label: 'Android', count: 2 },
      { label: 'iOS', count: 1 },
    ]);
    expect(stats.devices[0]).toEqual({ label: 'MOBILE', count: 3 });
    expect(stats.daily.at(-1)?.count).toBe(3);
  });

  it('reports zeroes for a link nobody has followed', async () => {
    const link = await newLink();
    const stats = await shortLinkClickService.stats(link.id);
    expect(stats.total_clicks).toBe(0);
    expect(stats.unique_visitors).toBe(0);
    expect(stats.countries_reached).toBe(0);
    expect(stats.daily).toEqual([]);
    expect(stats.platforms).toEqual([]);
  });

  // A lookup that could not place the visitor is "unknown", not a country.
  it('does not count an unresolved location as a country or a visitor', async () => {
    const link = await newLink();
    await click(link.id, link.code, { forwardedFor: '127.0.0.1', remoteAddress: null });

    const stats = await shortLinkClickService.stats(link.id);
    expect(stats.total_clicks).toBe(1);
    expect(stats.countries_reached).toBe(0);
    expect(stats.countries).toEqual([{ label: 'Unknown', count: 1 }]);
  });
});

describe('a click we could not place', () => {
  it('records no address hash and no location at all', async () => {
    const link = await newLink();
    await click(link.id, link.code, {
      referrer: null,
      forwardedFor: null,
      remoteAddress: null,
    });

    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    expect(doc?.ip_hash).toBeNull();
    expect(doc?.country).toBeNull();

    // And the table renders it without inventing values.
    const page = await shortLinkClickService.table(link.id);
    expect(page.rows[0]).toMatchObject({
      referrer_host: null,
      country: null,
      region: null,
      city: null,
      platform: 'Direct',
    });
  });
});

describe('shortLinkClickService.table', () => {
  it('pages the clicks of one link only, never another link', async () => {
    const link = await newLink();
    const other = await newLink();
    await click(link.id, link.code);
    await click(other.id, other.code);

    const page = await shortLinkClickService.table(link.id);
    expect(page.total).toBe(1);
    expect(page.rows[0].platform).toBe('Instagram');
    expect(page.rows[0].city).toBeTruthy();
  });

  it('filters by device and searches by place', async () => {
    const link = await newLink();
    await click(link.id, link.code);
    // A crawler that arrived with no referrer — so it is neither a phone nor
    // an Instagram click, and both narrowings below have something to exclude.
    await click(link.id, link.code, { userAgent: 'Googlebot/2.1', referrer: null });

    const bots = await shortLinkClickService.table(link.id, {
      filters: [{ field: 'device_type', op: 'eq', value: 'BOT' }],
    });
    expect(bots.total).toBe(1);

    const searched = await shortLinkClickService.table(link.id, { search: 'instagram' });
    expect(searched.total).toBe(1);
  });
});

describe('the public /r/:code route records the click', () => {
  const app = express();
  app.use('/r', buildShortLinkRouter());

  it('keeps the original referrer the website forwarded', async () => {
    const link = await newLink();
    const res = await request(app)
      .get(`/r/${link.code}`)
      .query({ dr: 'https://www.instagram.com/p/1' })
      .set('user-agent', ANDROID_CHROME)
      .set('x-forwarded-for', '103.21.244.0');

    expect(res.status).toBe(302);

    // Recording is deliberately not awaited by the handler, so give it a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    // Without `dr` this would read duncit.com — our own site — for every click.
    expect(doc?.platform).toBe('Instagram');
    expect(doc?.device_type).toBe('MOBILE');
  });

  it('records a click with no referrer as Direct', async () => {
    const link = await newLink();
    await request(app).get(`/r/${link.code}`).set('user-agent', IPHONE_SAFARI);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const doc = await ShortLinkClickModel.findOne({ code: link.code }).exec();
    expect(doc?.platform).toBe('Direct');
  });

  // Analytics must never cost the visitor their redirect.
  it('still redirects when recording the click blows up', async () => {
    const link = await newLink();
    const record = jest
      .spyOn(shortLinkClickService, 'record')
      .mockRejectedValue(new Error('mongo is down'));

    const res = await request(app).get(`/r/${link.code}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('utm_source=instagram');

    await new Promise((resolve) => setTimeout(resolve, 50));
    record.mockRestore();
  });
});
