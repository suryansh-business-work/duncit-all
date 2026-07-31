import { marketingDashboardService } from '../../marketingDashboard.service';
import { marketingResolvers } from '../../marketing.resolver';
import { shortLinkService } from '../../shortLink.service';
import { shortLinkClickService } from '../../shortLinkClick.service';
import { shortLinkJourneyService } from '../../shortLinkJourney.service';
import { ShortLinkClickModel } from '../../shortLinkClick.model';
import { MarketingCampaignModel } from '../../marketing.model';
import { AudienceListModel } from '../../audienceList.model';
import { AdRequestModel } from '@modules/ads/ads.model';
import { UserModel } from '@modules/access/user/user.model';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';

const MJML = '<mjml><mj-body><mj-text>Hello there</mj-text></mj-body></mjml>';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const linkInput = (label: string) => ({
  label,
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  source: 'INSTAGRAM' as const,
  medium: 'SOCIAL' as const,
});

let seq = 0;
const seedUser = async () => {
  seq += 1;
  return UserModel.create({
    auth: { email: `buyer${seq}@x.com` },
    profile: { first_name: 'Asha', last_name: `K${seq}` },
    metadata: { status: 'ACTIVE', role_keys: ['USER'] },
  });
};

const click = (linkId: string, code: string, clickId: string, over: Record<string, unknown> = {}) =>
  shortLinkClickService.record({
    clickId,
    code,
    shortLinkId: linkId,
    referrer: 'https://www.instagram.com/p/1',
    userAgent: ANDROID,
    forwardedFor: '103.21.244.0',
    ...over,
  });

const seedCampaign = (over: Record<string, unknown> = {}) =>
  MarketingCampaignModel.create({
    campaign_id: `camp-${Math.random().toString(36).slice(2)}`,
    name: 'August Push',
    channel: 'EMAIL',
    audience: 'NEWSLETTER_SUBSCRIBERS',
    subject: 'Pods near you',
    mjml: MJML,
    status: 'SENT',
    sent_at: new Date(),
    recipient_count: 100,
    open_count: 25,
    click_count: 10,
    ...over,
  });

describe('marketingDashboardService.overview', () => {
  it('reports an empty console without dividing by zero', async () => {
    const board = await marketingDashboardService.overview();
    expect(board.days).toBe(30);
    expect(board.links.total_clicks).toBe(0);
    // Rates on an empty console read 0%, never NaN.
    expect(board.links.conversion_rate).toBe(0);
    expect(board.campaigns.open_rate).toBe(0);
    expect(board.campaigns.click_rate).toBe(0);
    expect(board.links.top).toEqual([]);
    expect(board.campaigns.recent).toEqual([]);
  });

  it('totals clicks, visitors, conversions and revenue from the links', async () => {
    const link = await shortLinkService.create(linkInput('Diwali'), null);
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');
    await click(link.id, link.code, 'c-2');
    // A different visitor, from a different place.
    await click(link.id, link.code, 'c-3', {
      forwardedFor: '8.8.8.8',
      referrer: 'https://t.co/abc',
    });
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(user._id));
    await shortLinkJourneyService.attributePayment({
      userId: String(user._id),
      paymentId: new Types.ObjectId().toHexString(),
      amount: 2500,
    });

    const board = await marketingDashboardService.overview();
    expect(board.links.total_clicks).toBe(3);
    expect(board.links.unique_visitors).toBe(2);
    expect(board.links.conversions).toBe(1);
    expect(board.links.revenue).toBe(2500);
    expect(board.links.conversion_rate).toBeCloseTo(33.3, 1);
    expect(board.links.platforms).toEqual([
      { label: 'Instagram', count: 2 },
      { label: 'X (Twitter)', count: 1 },
    ]);
    expect(board.links.daily.at(-1)?.count).toBe(3);
    expect(board.links.top[0]).toMatchObject({ label: 'Diwali', clicks: 3, revenue: 2500 });
  });

  // A click whose location could not be resolved is "Unknown", not a country.
  it('labels an unresolved country rather than dropping the click', async () => {
    const link = await shortLinkService.create(linkInput('Poster'), null);
    await click(link.id, link.code, 'c-1', { forwardedFor: null, remoteAddress: null });
    const board = await marketingDashboardService.overview();
    expect(board.links.countries).toEqual([{ label: 'Unknown', count: 1 }]);
  });

  it('ranks the busiest links and survives one being deleted since', async () => {
    const busy = await shortLinkService.create(linkInput('Busy'), null);
    const quiet = await shortLinkService.create(linkInput('Quiet'), null);
    await click(busy.id, busy.code, 'c-1');
    await click(busy.id, busy.code, 'c-2');
    await click(quiet.id, quiet.code, 'c-3');
    // The clicks outlive the link they belonged to.
    await shortLinkService.remove(quiet.id);

    const board = await marketingDashboardService.overview();
    expect(board.links.top.map((row) => row.label)).toEqual(['Busy', 'Deleted link']);
    expect(board.links.top[1].code).toBe('');
  });

  it('counts standing figures outside the window', async () => {
    const active = await shortLinkService.create(linkInput('Active'), null);
    const retired = await shortLinkService.create(linkInput('Retired'), null);
    await shortLinkService.setActive(retired.id, false);
    await AudienceListModel.create({ name: 'Pune regulars', owner: 'Asha', filters: [] });

    const board = await marketingDashboardService.overview();
    // "How many links are live" is not a question about the last 30 days.
    expect(board.links.active).toBe(1);
    expect(board.links.total).toBe(2);
    expect(board.audience.lists).toBe(1);
    expect(active.is_active).toBe(true);
  });

  it('totals campaign sends, opens and rates', async () => {
    await seedCampaign();
    await seedCampaign({ recipient_count: 100, open_count: 75, click_count: 30 });
    await seedCampaign({ status: 'SCHEDULED', sent_at: null });
    await seedCampaign({ status: 'FAILED', sent_at: null });

    const board = await marketingDashboardService.overview();
    expect(board.campaigns.sent).toBe(2);
    expect(board.campaigns.scheduled).toBe(1);
    expect(board.campaigns.failed).toBe(1);
    expect(board.campaigns.recipients).toBe(200);
    expect(board.campaigns.opens).toBe(100);
    expect(board.campaigns.open_rate).toBe(50);
    expect(board.campaigns.click_rate).toBe(20);
    expect(board.campaigns.recent).toHaveLength(2);
    expect(board.campaigns.recent[0].open_rate).toBeGreaterThan(0);
  });

  it('reports a sent campaign that has no sent_at without crashing', async () => {
    await seedCampaign({ sent_at: null, status: 'SENT' });
    const board = await marketingDashboardService.overview();
    expect(board.campaigns.recent[0].sent_at).toBeNull();
  });

  // Only ads showing right now are live; a pending one is work waiting.
  it('separates live ads from ones awaiting approval', async () => {
    const now = Date.now();
    let traceSeq = 0;
    const base = () => ({
      trace_id: `AD-8${String(++traceSeq).padStart(5, '0')}`,
      submitted_by: new Types.ObjectId(),
      ad_title: 'Diwali banner',
      ad_description: 'desc',
      ad_type: 'IMAGE',
      media_url: 'https://cdn.example.com/live.jpg',
      position: 'SIDEBAR',
      duration_days: 7,
      estimated_cost: 1000,
    });
    await AdRequestModel.create({
      ...base(),
      status: 'APPROVED',
      start_at: new Date(now - 86_400_000),
      end_at: new Date(now + 86_400_000),
    });
    await AdRequestModel.create({
      ...base(),
      status: 'APPROVED',
      start_at: new Date(now - 30 * 86_400_000),
      end_at: new Date(now - 86_400_000),
    });
    await AdRequestModel.create({
      ...base(),
      status: 'PENDING',
      start_at: new Date(now),
      end_at: new Date(now + 86_400_000),
    });

    const board = await marketingDashboardService.overview();
    expect(board.ads.live).toBe(1);
    expect(board.ads.pending).toBe(1);
  });

  // Everything older than the window is somebody else's quarter.
  it('excludes activity older than the window', async () => {
    const link = await shortLinkService.create(linkInput('Old'), null);
    await click(link.id, link.code, 'c-old', { at: new Date(Date.now() - 60 * 86_400_000) });
    await seedCampaign({ sent_at: new Date(Date.now() - 60 * 86_400_000) });

    const board = await marketingDashboardService.overview(30);
    expect(board.links.total_clicks).toBe(0);
    expect(board.campaigns.sent).toBe(0);
    // The click still exists — it is just outside the window.
    expect(await ShortLinkClickModel.countDocuments({})).toBe(1);
  });

  it('honours a different window', async () => {
    const link = await shortLinkService.create(linkInput('Old'), null);
    await click(link.id, link.code, 'c-old', { at: new Date(Date.now() - 45 * 86_400_000) });
    const board = await marketingDashboardService.overview(90);
    expect(board.days).toBe(90);
    expect(board.links.total_clicks).toBe(1);
  });
});

describe('the marketingDashboard resolver', () => {
  it('is gated to the marketing roles', async () => {
    await expect(
      (async () =>
        (marketingResolvers.Query as any).marketingDashboard(
          {},
          {},
          makeContext({ roles: ['USER'] }),
        ))(),
    ).rejects.toThrow(/access denied/i);
  });

  it('serves a marketing manager, with the default window and an explicit one', async () => {
    const ctx = makeContext({ roles: ['MARKETING_MANAGER'] });
    const Q = marketingResolvers.Query as any;
    expect((await Q.marketingDashboard({}, {}, ctx)).days).toBe(30);
    expect((await Q.marketingDashboard({}, { days: 7 }, ctx)).days).toBe(7);
  });
});
