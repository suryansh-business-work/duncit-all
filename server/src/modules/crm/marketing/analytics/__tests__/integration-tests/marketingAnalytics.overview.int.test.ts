import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { marketingAnalyticsService } from '../../marketingAnalytics.service';
import { marketingAnalyticsResolvers } from '../../marketingAnalytics.resolver';
import { SocialAccountModel, SocialPostModel } from '../../../social/social.model';
import { SocialScheduledPostModel } from '../../../social/social.publish.model';
import { MarketingLeadModel } from '../../../leads/marketingLead.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { ShortLinkClickModel } from '../../../shortLinkClick.model';

const WINDOW = { from: '2026-10-01', to: '2026-10-02' };
const INSIDE = new Date('2026-10-01T06:00:00.000Z');

let seq = 0;
const clickAt = (clicked_at: Date, converted_amount: number | null = null) => {
  seq += 1;
  return ShortLinkClickModel.create({
    click_id: `click-${seq}`,
    code: 'aB3xY9Zq',
    short_link_id: new Types.ObjectId(),
    clicked_at,
    platform: 'Instagram',
    device_type: 'mobile',
    os: 'Android',
    browser: 'Chrome',
    converted_amount,
  });
};

describe('marketingAnalyticsService.overview', () => {
  it('reads an empty window as zeros', async () => {
    const overview = await marketingAnalyticsService.overview(WINDOW);
    expect(overview.window.days).toEqual(['2026-10-01', '2026-10-02']);
    expect(overview.social).toEqual({ followers: 0, follower_growth: 0, posts: 0, views: 0, engagement: 0, engagement_rate: 0 });
    expect(overview.content).toEqual({ from_duncit: 0, from_networks: 0, reels_made: 0, reels_posted: 0, reel_views: 0 });
    expect(overview.funnel).toEqual({ new_leads: 0, converted: 0, promoted: 0 });
    expect(overview.automation).toEqual({ runs: 0, success_rate: 0, cost: 0, tokens: 0 });
    expect(overview.links).toEqual({ clicks: 0, conversions: 0, conversion_rate: 0, revenue: 0 });
    expect(overview.daily).toEqual({ engagement: [0, 0], new_leads: [0, 0], clicks: [0, 0] });
  });

  it('carries each page’s headline and what the links earned in the window', async () => {
    const ig = await SocialAccountModel.create({ provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig', name: 'IG', followers: 500 });
    const fb = await SocialAccountModel.create({ provider: 'FACEBOOK', platform: 'FACEBOOK', external_id: 'fb', name: 'FB', followers: 100 });
    await SocialPostModel.create({ account_id: String(ig._id), platform: 'INSTAGRAM', external_id: 'p1', published_at: INSIDE, engagement: 30, views: 200 });
    await SocialPostModel.create({ account_id: String(fb._id), platform: 'FACEBOOK', external_id: 'p2', published_at: INSIDE, engagement: 6 });
    await SocialScheduledPostModel.create({ status: 'PUBLISHED', published_at: INSIDE, targets: [{ account_id: String(ig._id), platform: 'INSTAGRAM', status: 'PUBLISHED' }] });
    await MarketingLeadModel.collection.insertOne({
      name: 'Cafe',
      pipeline: 'VENUE',
      stage: 'CONVERTED',
      source: 'MANUAL',
      created_at: INSIDE,
      timeline: [{ at: new Date('2026-10-02T06:00:00.000Z'), kind: 'STAGE', text: 'NEW → CONVERTED', by_name: 'Asha' }],
      crm_ref: { kind: 'VENUE', id: 'v1', promoted_at: new Date('2026-10-02T07:00:00.000Z'), promoted_by: 'u1' },
    });
    await MarketingRunModel.collection.insertOne({ workflow: 'REEL', name: 'Reel', status: 'COMPLETED', created_at: INSIDE, cost: { tokens_in: 10, tokens_out: 5, amount: 0.05 } });
    await clickAt(INSIDE, 1500);
    await clickAt(new Date('2026-10-02T06:00:00.000Z'));
    // After the window.
    await clickAt(new Date('2026-10-02T18:30:00.000Z'), 9999);

    const overview = await marketingAnalyticsService.overview(WINDOW);
    // (36 / 2 posts) / 600 followers = 3%
    expect(overview.social).toEqual({ followers: 600, follower_growth: 0, posts: 2, views: 200, engagement: 36, engagement_rate: 3 });
    expect(overview.content).toMatchObject({ from_duncit: 1, from_networks: 2 });
    expect(overview.funnel).toEqual({ new_leads: 1, converted: 1, promoted: 1 });
    expect(overview.automation).toEqual({ runs: 1, success_rate: 100, cost: 0.05, tokens: 15 });
    expect(overview.links).toEqual({ clicks: 2, conversions: 1, conversion_rate: 50, revenue: 1500 });
    expect(overview.daily).toEqual({ engagement: [36, 0], new_leads: [1, 0], clicks: [1, 1] });
  });

  it('narrows the social headline to the asked networks; leads, runs and links have none', async () => {
    const ig = await SocialAccountModel.create({ provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig', followers: 500 });
    await SocialAccountModel.create({ provider: 'X', platform: 'X', external_id: 'x', followers: 100 });
    await SocialPostModel.create({ account_id: String(ig._id), platform: 'INSTAGRAM', external_id: 'p1', published_at: INSIDE, engagement: 30 });
    await clickAt(INSIDE);

    const overview = await marketingAnalyticsService.overview({ ...WINDOW, platforms: ['X'] });
    expect(overview.social).toMatchObject({ followers: 100, posts: 0, engagement: 0 });
    expect(overview.links.clicks).toBe(1);
  });
});

describe('marketingAnalyticsResolvers', () => {
  const { Query } = marketingAnalyticsResolvers;
  const reader = makeContext({ roles: ['MARKETING_READER'] });
  const input = { input: WINDOW };

  it('lets every marketing seat read every page', async () => {
    await expect(Query.marketingAnalyticsOverview({}, input, reader)).resolves.toHaveProperty('links');
    await expect(Query.marketingAnalyticsSocial({}, input, reader)).resolves.toHaveProperty('networks');
    await expect(Query.marketingAnalyticsContent({}, input, reader)).resolves.toHaveProperty('formats');
    await expect(Query.marketingAnalyticsFunnel({}, { ...input, pipeline: 'VENUE' }, reader)).resolves.toMatchObject({ pipeline: 'VENUE' });
    await expect(Query.marketingAnalyticsAutomation({}, input, reader)).resolves.toHaveProperty('approvals');
    for (const role of ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR']) {
      await expect(Query.marketingAnalyticsSocial({}, input, makeContext({ roles: [role] }))).resolves.toBeDefined();
    }
  });

  // The role gate and the window check both refuse before any read starts, so they throw at the call.
  it('refuses anyone else, and a signed-out caller', () => {
    const member = makeContext({ roles: ['USER'] });
    expect(() => Query.marketingAnalyticsOverview({}, input, member)).toThrow(/access denied/i);
    expect(() => Query.marketingAnalyticsSocial({}, input, member)).toThrow(/access denied/i);
    expect(() => Query.marketingAnalyticsContent({}, input, member)).toThrow(/access denied/i);
    expect(() => Query.marketingAnalyticsFunnel({}, input, member)).toThrow(/access denied/i);
    expect(() => Query.marketingAnalyticsAutomation({}, input, makeContext(null))).toThrow();
  });

  it('refuses a window it cannot read', () => {
    expect(() => Query.marketingAnalyticsSocial({}, { input: { from: '2026-10-05', to: '2026-10-01' } }, reader)).toThrow(
      'The window ends before it starts.'
    );
  });
});
