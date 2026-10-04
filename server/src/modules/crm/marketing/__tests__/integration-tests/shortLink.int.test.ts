import express from 'express';
import request from 'supertest';
import { shortLinkService } from '../../shortLink.service';
import { shortLinkResolvers } from '../../shortLink.resolver';
import { buildShortLinkRouter } from '../../shortLink.router';
import { ShortLinkModel } from '../../shortLink.model';
import { ShortLinkClickModel } from '../../shortLinkClick.model';
import { MarketingCampaignModel } from '../../marketing.model';
import { makeContext } from '@test/harness';

const MJML = '<mjml><mj-body><mj-text>Hello there</mj-text></mj-body></mjml>';

const base = {
  label: 'Diwali pod push',
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  source: 'INSTAGRAM' as const,
  medium: 'SOCIAL' as const,
};

const seedCampaign = () =>
  MarketingCampaignModel.create({
    campaign_id: 'camp-1',
    name: 'Badminton Launch',
    channel: 'EMAIL',
    audience: 'NEWSLETTER_SUBSCRIBERS',
    subject: 'Play this weekend',
    mjml: MJML,
  });

describe('shortLinkService.create', () => {
  it('mints a code and freezes the tagging onto the link', async () => {
    const link = await shortLinkService.create(base, 'user-1');
    expect(link.code).toMatch(/^(?=.*\d)(?=.*[A-Z])[A-Za-z\d]{8}$/);
    expect(link.utm_source).toBe('instagram');
    expect(link.utm_medium).toBe('social');
    expect(link.short_url.endsWith(`/${link.code}`)).toBe(true);
    expect(link.tagged_url).toContain('utm_source=instagram');
    expect(link.tagged_url).toContain(`dl=${link.code}`);
    expect(link.is_active).toBe(true);
    expect(link.click_count).toBe(0);
  });

  it('takes the campaign name as the campaign tag', async () => {
    await seedCampaign();
    const link = await shortLinkService.create({ ...base, campaign_id: 'camp-1' }, null);
    expect(link.utm_campaign).toBe('badminton_launch');
    expect(link.campaign_id).toBe('camp-1');
  });

  it('refuses a campaign that is not there', async () => {
    await expect(
      shortLinkService.create({ ...base, campaign_id: 'gone' }, null),
    ).rejects.toThrow(/no longer exists/i);
  });

  it('slugs the free text when the channel or medium is Other', async () => {
    const link = await shortLinkService.create(
      {
        ...base,
        source: 'OTHER',
        source_other: 'Campus Ambassador',
        medium: 'OTHER',
        medium_other: 'Print Flyer',
      },
      null,
    );
    expect(link.utm_source).toBe('campus_ambassador');
    expect(link.source_other).toBe('Campus Ambassador');
    expect(link.utm_medium).toBe('print_flyer');
    expect(link.medium_other).toBe('Print Flyer');
  });

  // An untagged link is worse than a refused one — it silently loses the
  // attribution the marketer thought they were setting up.
  it('refuses Other with nothing said', async () => {
    await expect(
      shortLinkService.create({ ...base, source: 'OTHER', source_other: '  ' }, null),
    ).rejects.toThrow(/say what the source is/i);
    await expect(
      shortLinkService.create({ ...base, medium: 'OTHER', medium_other: null }, null),
    ).rejects.toThrow(/say what the medium is/i);
  });

  it('drops a stale Other text when a real channel is picked', async () => {
    const link = await shortLinkService.create(
      { ...base, source_other: 'left over', medium_other: 'left over' },
      null,
    );
    expect(link.source_other).toBeNull();
    expect(link.medium_other).toBeNull();
  });

  // duncit.com/<code> carries our brand — it may point at a public https site,
  // but never somewhere the public internet cannot reach, nor over plain http.
  it('refuses an external destination that is not public https', async () => {
    await expect(
      shortLinkService.create({ ...base, destination_url: 'https://evil.example/free' }, null),
    ).rejects.toThrow(/not reachable on the public internet/i);
    await expect(
      shortLinkService.create({ ...base, destination_url: 'http://www.partner-site.com/offer' }, null),
    ).rejects.toThrow(/has to be https/i);
  });

  it('marks a public https destination that is not ours as external', async () => {
    const link = await shortLinkService.create(
      { ...base, destination_url: 'https://www.partner-site.com/offer' },
      null,
    );
    expect(link.is_external).toBe(true);
    expect(link.destination_url).toBe('https://www.partner-site.com/offer');
  });

  it('allows the app stores, for install campaigns', async () => {
    const link = await shortLinkService.create(
      { ...base, destination_url: 'https://play.google.com/store/apps/details?id=com.duncit' },
      null,
    );
    expect(link.destination_url).toContain('play.google.com');
  });

  it('refuses a destination that is not a url at all, or not http', async () => {
    await expect(
      shortLinkService.create({ ...base, destination_url: 'mweb.duncit.com/pods' }, null),
    ).rejects.toThrow(/full URL/i);
    await expect(
      shortLinkService.create({ ...base, destination_url: 'javascript:alert(1)' }, null),
    ).rejects.toThrow(/http or https/i);
  });

  it('refuses a link with no usable label', async () => {
    await expect(shortLinkService.create({ ...base, label: 'x' }, null)).rejects.toThrow();
  });
});

describe('shortLinkService.update', () => {
  const forced = {
    meta_override_enabled: true,
    meta_title: 'Diwali night run',
    meta_description: 'Lights, 5K, chai after',
    meta_image_url: 'https://ik.imagekit.io/duncit/diwali.jpg',
  };

  it('renames, re-points and stores a forced card', async () => {
    const link = await shortLinkService.create(base, null);
    const updated = await shortLinkService.update(link.id, {
      label: 'Diwali run push',
      destination_url: 'https://mweb.duncit.com/club/c2/pod/p9',
      ...forced,
    });
    expect(updated).toMatchObject({
      label: 'Diwali run push',
      destination_url: 'https://mweb.duncit.com/club/c2/pod/p9',
      utm_source: link.utm_source,
      ...forced,
    });
  });

  it('clears a forced card when the link moves and no card is sent with it', async () => {
    const link = await shortLinkService.create({ ...base, ...forced }, null);
    const moved = await shortLinkService.update(link.id, {
      label: base.label,
      destination_url: 'https://mweb.duncit.com/club/c2',
    });
    expect(moved).toMatchObject({ meta_override_enabled: false, meta_title: null, meta_image_url: null });
  });

  it('keeps a forced card when only the label changes', async () => {
    const link = await shortLinkService.create({ ...base, ...forced }, null);
    const renamed = await shortLinkService.update(link.id, { label: 'Renamed', destination_url: base.destination_url });
    expect(renamed.meta_title).toBe(forced.meta_title);
  });

  it('refuses a move between a Duncit and an external destination', async () => {
    const link = await shortLinkService.create(base, null);
    await expect(
      shortLinkService.update(link.id, { label: base.label, destination_url: 'https://www.partner-site.com/offer' }),
    ).rejects.toThrow(/External Links/);
  });

  it('refuses to re-point a share link, but lets its card be forced', async () => {
    const link = await shortLinkService.create(base, null);
    await ShortLinkModel.updateOne({ _id: link.id }, { $set: { share_target: 'POD', share_key: 'POD:p1' } });
    await expect(
      shortLinkService.update(link.id, { label: base.label, destination_url: 'https://mweb.duncit.com/club/c2' }),
    ).rejects.toThrow(/cannot be changed/);
    const card = await shortLinkService.update(link.id, {
      label: base.label,
      destination_url: base.destination_url,
      ...forced,
    });
    expect(card.meta_override_enabled).toBe(true);
  });

  it('refuses an override with no title', async () => {
    const link = await shortLinkService.create(base, null);
    await expect(
      shortLinkService.update(link.id, { ...base, meta_override_enabled: true, meta_title: ' ' }),
    ).rejects.toThrow(/title/);
  });
});

describe('shortLinkService.resolve', () => {
  it('returns the tagged destination and counts the click', async () => {
    const link = await shortLinkService.create(base, null);
    const resolved = await shortLinkService.resolve(link.code);
    expect(resolved?.destination).toContain('utm_source=instagram');
    expect(resolved?.destination).toContain(`dl=${link.code}`);
    expect(resolved?.shortLinkId).toBe(link.id);

    const doc = await ShortLinkModel.findOne({ code: link.code }).exec();
    expect(doc?.click_count).toBe(1);
    expect(doc?.first_clicked_at).not.toBeNull();

    // Read back through the public shape the portal actually renders.
    const reread = await shortLinkService.byId(link.id);
    expect(typeof reread.first_clicked_at).toBe('string');
    expect(typeof reread.last_clicked_at).toBe('string');
  });

  it('keeps the first click time and moves the last', async () => {
    const link = await shortLinkService.create(base, null);
    const early = new Date('2026-07-31T09:00:00.000Z');
    const later = new Date('2026-07-31T18:00:00.000Z');
    await shortLinkService.resolve(link.code, early);
    await shortLinkService.resolve(link.code, later);

    const doc = await ShortLinkModel.findOne({ code: link.code }).exec();
    expect(doc?.click_count).toBe(2);
    expect(doc?.first_clicked_at?.toISOString()).toBe(early.toISOString());
    expect(doc?.last_clicked_at?.toISOString()).toBe(later.toISOString());
  });

  // The click id travels into the destination so a later signup or payment
  // can be traced back to the exact click that produced it.
  it('carries the click id into the destination when one is given', async () => {
    const link = await shortLinkService.create(base, null);
    const resolved = await shortLinkService.resolve(link.code, new Date(), 'click-abc');
    expect(resolved?.destination).toContain('dlc=click-abc');
  });

  it('resolves nothing for an unknown or retired code', async () => {
    const link = await shortLinkService.create(base, null);
    expect(await shortLinkService.resolve('zzzzzzzz')).toBeNull();

    await shortLinkService.setActive(link.id, false);
    expect(await shortLinkService.resolve(link.code)).toBeNull();
    // A retired link keeps its history rather than losing the counts.
    expect((await ShortLinkModel.findOne({ code: link.code }).exec())?.click_count).toBe(0);
  });
});

describe('shortLinkService reads and writes', () => {
  it('pages, searches and sorts the table', async () => {
    await shortLinkService.create({ ...base, label: 'Alpha launch' }, null);
    await shortLinkService.create({ ...base, label: 'Beta launch', source: 'FACEBOOK' }, null);

    const all = await shortLinkService.table();
    expect(all.total).toBe(2);

    const searched = await shortLinkService.table({ search: 'alpha' });
    expect(searched.rows.map((row) => row.label)).toEqual(['Alpha launch']);

    const filtered = await shortLinkService.table({
      filters: [{ field: 'source', op: 'eq', value: 'FACEBOOK' }],
    });
    expect(filtered.rows.map((row) => row.label)).toEqual(['Beta launch']);

    const sorted = await shortLinkService.table({ sort_by: 'label', sort_dir: 'asc' });
    expect(sorted.rows.map((row) => row.label)).toEqual(['Alpha launch', 'Beta launch']);
  });

  it('reads one link, and refuses an id that is not there', async () => {
    const link = await shortLinkService.create(base, null);
    expect((await shortLinkService.byId(link.id)).code).toBe(link.code);
    await expect(shortLinkService.byId('64b7f9c2f1a2b3c4d5e6f7a8')).rejects.toThrow(/not found/i);
  });

  it('renders a QR image of the short url', async () => {
    const link = await shortLinkService.create(base, null);
    const qr = await shortLinkService.qrDataUrl(link.id);
    expect(qr.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('retires and revives a link', async () => {
    const link = await shortLinkService.create(base, null);
    expect((await shortLinkService.setActive(link.id, false)).is_active).toBe(false);
    expect((await shortLinkService.setActive(link.id, true)).is_active).toBe(true);
    await expect(shortLinkService.setActive('64b7f9c2f1a2b3c4d5e6f7a8', false)).rejects.toThrow(
      /not found/i,
    );
  });

  it('deletes a link, and refuses an id that is not there', async () => {
    const link = await shortLinkService.create(base, null);
    expect(await shortLinkService.remove(link.id)).toBe(true);
    await expect(shortLinkService.remove(link.id)).rejects.toThrow(/not found/i);
  });

  // Random codes can in principle collide; the retry loop must give up loudly
  // rather than spin or hand back a duplicate.
  it('gives up rather than issue a code it could not prove unique', async () => {
    const exists = jest
      .spyOn(ShortLinkModel, 'exists')
      .mockResolvedValue({ _id: 'taken' } as never);
    await expect(shortLinkService.create(base, null)).rejects.toThrow(/Could not allocate/i);
    expect(exists).toHaveBeenCalledTimes(5);
    exists.mockRestore();
  });
});

describe('shortLink resolvers', () => {
  const ctx = makeContext({ roles: ['MARKETING_MANAGER'] });
  const Q = shortLinkResolvers.Query as any;
  const M = shortLinkResolvers.Mutation as any;

  it('wires every query and mutation through to the service', async () => {
    expect((await Q.shortLinkOptions({}, {}, ctx)).sources.length).toBeGreaterThan(0);

    const created = await M.createShortLink({}, { input: base }, ctx);
    expect(created.code).toHaveLength(8);

    expect((await Q.shortLinksTable({}, { query: null }, ctx)).total).toBe(1);
    expect((await Q.shortLink({}, { id: created.id }, ctx)).code).toBe(created.code);
    expect(await Q.shortLinkQr({}, { id: created.id }, ctx)).toContain('data:image/png');

    expect((await Q.shortLinkStats({}, { id: created.id }, ctx)).total_clicks).toBe(0);
    expect((await Q.shortLinkClicks({}, { id: created.id, query: null }, ctx)).total).toBe(0);
    expect((await Q.shortLinkFunnel({}, { id: created.id }, ctx)).steps.length).toBeGreaterThan(0);
    expect((await Q.shortLinkJourneys({}, { id: created.id, query: null }, ctx)).total).toBe(0);

    const retired = await M.setShortLinkActive({}, { id: created.id, is_active: false }, ctx);
    expect(retired.is_active).toBe(false);
    expect(await M.deleteShortLink({}, { id: created.id }, ctx)).toBe(true);
  });
});

describe('recordShortLinkJourney is public', () => {
  const M = shortLinkResolvers.Mutation as any;
  // A funnel step is marketing attribution: it is written only with consent.
  const consented = (...args: Parameters<typeof makeContext>) => ({
    ...makeContext(...args),
    consent: { analytics: false, marketing: true },
  });

  const mintClick = async () => {
    const link = await shortLinkService.create(base, null);
    const app = express();
    app.use('/r', buildShortLinkRouter());
    const minted = await request(app).get('/r/v').query({ dl: link.code });
    return { link, clickId: minted.body.click_id as string };
  };

  // Most of this funnel happens before anyone signs in, so requiring auth
  // would make the anonymous half unmeasurable. The false answer is "unknown
  // click", not a refusal — the point is that no access check threw.
  it('accepts a step from a signed-out visitor', async () => {
    expect(
      await M.recordShortLinkJourney({}, { click_id: 'c-x', step: 'LANDED' }, consented()),
    ).toBe(false);
  });

  it('accepts a step from a signed-in visitor and binds the account', async () => {
    const { link, clickId } = await mintClick();

    const ctx = consented({ roles: ['USER'] });
    expect(
      await M.recordShortLinkJourney({}, { click_id: clickId, step: 'SIGNED_UP' }, ctx),
    ).toBe(true);
    const journey = await shortLinkService.clicks(link.id, null);
    expect(journey.total).toBe(1);
  });

  it('records nothing for a visitor who has not allowed marketing', async () => {
    const { clickId } = await mintClick();
    const ctx = { ...makeContext({ roles: ['USER'] }), consent: { analytics: true, marketing: false } };
    expect(
      await M.recordShortLinkJourney({}, { click_id: clickId, step: 'SIGNED_UP' }, ctx),
    ).toBe(false);
    const click = await ShortLinkClickModel.findOne({ click_id: clickId }).lean();
    expect(click).not.toBeNull();
    expect(click?.journey.map((j) => j.step)).not.toContain('SIGNED_UP');
    expect(click?.user_id ?? null).toBeNull();
  });
});

describe('the public /r/:code route', () => {
  const app = express();
  app.use('/r', buildShortLinkRouter());

  it('302s to the tagged destination', async () => {
    const link = await shortLinkService.create(base, null);
    const res = await request(app).get(`/r/${link.code}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('utm_source=instagram');
    expect(res.headers.location).toContain(`dl=${link.code}`);
    expect(res.headers.location).toContain('dlc=');
    // 301 would be cached by the browser and later clicks would never reach
    // us, silently freezing the counts.
    expect(res.status).not.toBe(301);
  });

  it('404s a retired link without guessing a destination', async () => {
    const link = await shortLinkService.create(base, null);
    await shortLinkService.setActive(link.id, false);
    const res = await request(app).get(`/r/${link.code}`);
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/no longer active/i);
  });

  // The apex sends real traffic here and scanners try every path — anything
  // that is not code-shaped is rejected before it costs a database lookup.
  it('404s a path that is not code-shaped, without touching the database', async () => {
    const find = jest.spyOn(ShortLinkModel, 'findOne');
    for (const path of ['/r/about', '/r/lowercase', '/r/TOOLONGCODE']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.text).toMatch(/not found/i);
    }
    expect(find).not.toHaveBeenCalled();
    find.mockRestore();
  });

  it('404s rather than leak an error when the lookup blows up', async () => {
    const resolve = jest
      .spyOn(shortLinkService, 'resolve')
      .mockRejectedValue(new Error('mongo is down'));
    const res = await request(app).get('/r/aB3xY9Zq');
    expect(res.status).toBe(404);
    expect(res.text).not.toMatch(/mongo/i);
    resolve.mockRestore();
  });

  describe('a link-preview crawler', () => {
    const WHATSAPP = 'WhatsApp/2.24.1 A';

    it('gets the forced card, uncached, and the visit is not counted', async () => {
      const link = await shortLinkService.create(
        {
          ...base,
          meta_override_enabled: true,
          meta_title: 'Diwali night run',
          meta_description: 'Lights, 5K, chai after',
          meta_image_url: 'https://ik.imagekit.io/duncit/diwali.jpg',
        },
        null,
      );
      const res = await request(app).get(`/r/${link.code}`).set('User-Agent', WHATSAPP);
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toContain('<meta property="og:title" content="Diwali night run" />');
      expect(res.text).toContain('https://ik.imagekit.io/duncit/diwali.jpg');
      expect((await shortLinkService.byId(link.id)).click_count).toBe(0);
    });

    it('shows the new card on the very next unfurl after an edit', async () => {
      const link = await shortLinkService.create(
        { ...base, meta_override_enabled: true, meta_title: 'First', meta_description: 'd', meta_image_url: 'https://ik.imagekit.io/duncit/a.jpg' },
        null,
      );
      await shortLinkService.update(link.id, {
        label: base.label,
        destination_url: base.destination_url,
        meta_override_enabled: true,
        meta_title: 'Second',
        meta_description: 'd',
        meta_image_url: 'https://ik.imagekit.io/duncit/a.jpg',
      });
      const res = await request(app).get(`/r/${link.code}`).set('User-Agent', WHATSAPP);
      expect(res.text).toContain('content="Second"');
      expect(res.text).not.toContain('content="First"');
    });

    // A short link pointing at another short link would otherwise have each
    // card fetch the other forever.
    it('does not read the destination page for a request that is our own unfurl', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const link = await shortLinkService.create(
        { ...base, destination_url: 'https://mweb.duncit.com/explore' },
        null,
      );
      const res = await request(app)
        .get(`/r/${link.code}`)
        .set('User-Agent', WHATSAPP)
        .set('x-duncit-unfurl', '1');
      expect(res.status).toBe(302);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
