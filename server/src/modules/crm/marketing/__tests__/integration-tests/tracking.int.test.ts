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
    tracked_links: ['https://duncit.com/pods'],
    ...over,
  });

const reread = () => MarketingCampaignModel.findOne({ campaign_id: 'camp-1' }).exec();

describe('campaignTrackingService', () => {
  it('counts every open, not just the first', async () => {
    await seed();
    await campaignTrackingService.recordOpen('camp-1');
    await campaignTrackingService.recordOpen('camp-1');
    expect((await reread())?.open_count).toBe(2);
  });

  it('ignores a pixel hit for a campaign that is gone', async () => {
    await expect(campaignTrackingService.recordOpen('nope')).resolves.toBeUndefined();
  });

  it('resolves a tracked link to its destination and counts the click', async () => {
    await seed();
    expect(await campaignTrackingService.resolveClick('camp-1', 0)).toBe('https://duncit.com/pods');
    expect((await reread())?.click_count).toBe(1);
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
