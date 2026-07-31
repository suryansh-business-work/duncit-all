import { campaignTrackingService } from '../../tracking.service';
import { MarketingCampaignModel } from '../../marketing.model';

const MJML = '<mjml><mj-body><mj-text>Hello there</mj-text></mj-body></mjml>';

const seed = (over: Record<string, unknown> = {}) =>
  MarketingCampaignModel.create({
    campaign_id: 'camp-1',
    name: 'August Push',
    channel: 'EMAIL',
    audience: 'NEWSLETTER_SUBSCRIBERS',
    subject: 'Pods near you',
    mjml: MJML,
    status: 'SENT',
    tracked_links: [{ url: 'https://duncit.com/pods', kind: 'CTA' }],
    tracked_images: [{ url: 'https://cdn.duncit.com/a.png' }],
    ...over,
  });

const reread = () => MarketingCampaignModel.findOne({ campaign_id: 'camp-1' }).exec();

const EARLY = new Date('2026-07-31T09:00:00.000Z');
const LATER = new Date('2026-07-31T18:30:00.000Z');

describe('campaignTrackingService opens', () => {
  it('counts every open, not just the first', async () => {
    await seed();
    await campaignTrackingService.recordOpen('camp-1');
    await campaignTrackingService.recordOpen('camp-1');
    expect((await reread())?.open_count).toBe(2);
  });

  // The first open is the campaign's headline moment — a later read must not
  // overwrite it, and the last read must always move.
  it('keeps the first open time and moves the last', async () => {
    await seed();
    await campaignTrackingService.recordOpen('camp-1', EARLY);
    await campaignTrackingService.recordOpen('camp-1', LATER);
    const doc = await reread();
    expect(doc?.first_opened_at?.toISOString()).toBe(EARLY.toISOString());
    expect(doc?.last_opened_at?.toISOString()).toBe(LATER.toISOString());
  });

  it('ignores a pixel hit for a campaign that is gone', async () => {
    await expect(campaignTrackingService.recordOpen('nope')).resolves.toBeUndefined();
  });
});

describe('campaignTrackingService images', () => {
  it('resolves an image, counts it per image and in total', async () => {
    await seed();
    expect(await campaignTrackingService.recordImageLoad('camp-1', 0)).toBe(
      'https://cdn.duncit.com/a.png',
    );
    await campaignTrackingService.recordImageLoad('camp-1', 0);
    const doc = await reread();
    expect(doc?.image_load_count).toBe(2);
    expect(doc?.tracked_images[0].load_count).toBe(2);
  });

  // A picture the recipient chose to load proves they opened it — but five
  // images in one email is one read, not five.
  it('stamps the open times without inflating the open count', async () => {
    await seed();
    await campaignTrackingService.recordImageLoad('camp-1', 0, EARLY);
    const doc = await reread();
    expect(doc?.first_opened_at?.toISOString()).toBe(EARLY.toISOString());
    expect(doc?.open_count).toBe(0);
  });

  it('refuses an index outside the image table, and a campaign that is gone', async () => {
    await seed();
    expect(await campaignTrackingService.recordImageLoad('camp-1', 9)).toBeNull();
    expect(await campaignTrackingService.recordImageLoad('camp-1', Number.NaN)).toBeNull();
    expect(await campaignTrackingService.recordImageLoad('nope', 0)).toBeNull();
    expect((await reread())?.image_load_count).toBe(0);
  });
});

describe('campaignTrackingService clicks', () => {
  it('resolves a tracked link and counts the click per link and in total', async () => {
    await seed();
    expect(await campaignTrackingService.resolveClick('camp-1', 0)).toBe('https://duncit.com/pods');
    const doc = await reread();
    expect(doc?.click_count).toBe(1);
    expect(doc?.tracked_links[0].click_count).toBe(1);
    expect(doc?.tracked_links[0].kind).toBe('CTA');
  });

  it('treats a click as proof of an open', async () => {
    await seed();
    await campaignTrackingService.resolveClick('camp-1', 0, EARLY);
    expect((await reread())?.first_opened_at?.toISOString()).toBe(EARLY.toISOString());
  });

  // The redirect must only ever go somewhere the email actually pointed at.
  it('refuses an index outside the campaign link table, and counts nothing', async () => {
    await seed();
    expect(await campaignTrackingService.resolveClick('camp-1', 7)).toBeNull();
    expect(await campaignTrackingService.resolveClick('camp-1', Number.NaN)).toBeNull();
    expect((await reread())?.click_count).toBe(0);
  });

  it('refuses a click for a campaign that is gone', async () => {
    expect(await campaignTrackingService.resolveClick('nope', 0)).toBeNull();
  });
});
