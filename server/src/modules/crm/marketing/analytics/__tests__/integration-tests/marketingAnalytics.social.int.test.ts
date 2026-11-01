import { marketingAnalyticsService } from '../../marketingAnalytics.service';
import { SocialAccountModel, SocialAccountSnapshotModel, SocialPostModel } from '../../../social/social.model';

/** 1–3 October in the admin zone (Asia/Kolkata): 30 Sep 18:30 UTC to 3 Oct 18:30 UTC. */
const WINDOW = { from: '2026-10-01', to: '2026-10-03' };

let seq = 0;
const account = (platform: string, followers: number, name = `${platform} page`) => {
  seq += 1;
  return SocialAccountModel.create({ provider: platform, platform, external_id: `acc-${seq}`, name, followers });
};

const post = (acc: { _id: unknown; platform: string }, at: string, over: Record<string, unknown> = {}) => {
  seq += 1;
  return SocialPostModel.create({
    account_id: String(acc._id),
    platform: acc.platform,
    external_id: `post-${seq}`,
    text: `Post ${seq}`,
    published_at: new Date(at),
    likes: 0,
    comments: 0,
    shares: 0,
    views: null,
    engagement: 0,
    ...over,
  });
};

const snapshot = (acc: { _id: unknown }, day: string, followers: number) =>
  SocialAccountSnapshotModel.create({ account_id: String(acc._id), day, followers });

describe('marketingAnalyticsService.social', () => {
  it('reads an empty window as zeros, one slot per day', async () => {
    const social = await marketingAnalyticsService.social(WINDOW);
    expect(social.window).toEqual({ from: '2026-10-01', to: '2026-10-03', days: ['2026-10-01', '2026-10-02', '2026-10-03'] });
    expect(social).toMatchObject({ followers: 0, follower_growth: 0, posts: 0, views: 0, engagement: 0, engagement_rate: 0 });
    expect(social.daily).toEqual({
      followers: [null, null, null],
      posts: [0, 0, 0],
      views: [0, 0, 0],
      engagement: [0, 0, 0],
      engagement_rate: [0, 0, 0],
    });
    expect(social.networks).toEqual([]);
    expect(social.accounts).toEqual([]);
    expect(social.top_posts).toEqual([]);
  });

  it('counts only posts inside the window, by the admin-zone day', async () => {
    const ig = await account('INSTAGRAM', 1000);
    // 30 Sep 18:29 UTC is 23:59 IST on the 30th — before the window.
    await post(ig, '2026-09-30T18:29:00.000Z', { engagement: 500 });
    // 30 Sep 18:30 UTC is midnight IST on the 1st — the first instant inside.
    await post(ig, '2026-09-30T18:30:00.000Z', { likes: 8, comments: 2, engagement: 10, views: 100 });
    await post(ig, '2026-10-03T18:29:59.000Z', { shares: 5, engagement: 30 });
    // Midnight IST on the 4th — after the window.
    await post(ig, '2026-10-03T18:30:00.000Z', { engagement: 900 });

    const social = await marketingAnalyticsService.social(WINDOW);
    expect(social).toMatchObject({ posts: 2, likes: 8, comments: 2, shares: 5, views: 100, engagement: 40 });
    expect(social.daily.posts).toEqual([1, 0, 1]);
    expect(social.daily.engagement).toEqual([10, 0, 30]);
    expect(social.daily.views).toEqual([100, 0, 0]);
  });

  it('works out engagement rate per network and per day against followers', async () => {
    const ig = await account('INSTAGRAM', 1000, 'Duncit IG');
    const fb = await account('FACEBOOK', 200, 'Duncit FB');
    await post(ig, '2026-10-01T06:00:00.000Z', { engagement: 30, views: 400 });
    await post(ig, '2026-10-02T06:00:00.000Z', { engagement: 10, views: 100 });
    await post(fb, '2026-10-02T06:00:00.000Z', { engagement: 4 });
    await snapshot(ig, '2026-10-01', 1000);
    await snapshot(fb, '2026-10-01', 200);

    const social = await marketingAnalyticsService.social(WINDOW);
    // (44 engagement / 3 posts) / 1200 followers = 1.22%
    expect(social.engagement_rate).toBe(1.22);
    expect(social.networks).toEqual([
      { platform: 'FACEBOOK', followers: 200, posts: 1, views: 0, likes: 0, comments: 0, shares: 0, engagement: 4, engagement_rate: 2 },
      { platform: 'INSTAGRAM', followers: 1000, posts: 2, views: 500, likes: 0, comments: 0, shares: 0, engagement: 40, engagement_rate: 2 },
    ]);
    // Day 1: 30/1 over 1200 = 2.5%; day 2: 14/2 over 1200 = 0.58%; day 3 had no posts.
    expect(social.daily.engagement_rate).toEqual([2.5, 0.58, 0]);
    expect(social.daily.followers).toEqual([1200, 1200, 1200]);
  });

  it('measures each account’s growth from its last count before the window to its last count inside', async () => {
    const ig = await account('INSTAGRAM', 1300);
    const fb = await account('FACEBOOK', 90);
    const yt = await account('YOUTUBE', 0);
    await snapshot(ig, '2026-09-20', 1000);
    await snapshot(ig, '2026-10-02', 1250);
    // Taken after the window: not this window's growth.
    await snapshot(ig, '2026-10-09', 1300);
    // First counted inside the window: growth from that first count.
    await snapshot(fb, '2026-10-02', 70);
    await snapshot(fb, '2026-10-03', 90);

    const social = await marketingAnalyticsService.social(WINDOW);
    const byPlatform = new Map(social.accounts.map((row) => [row.platform, row]));
    expect(byPlatform.get('INSTAGRAM')).toMatchObject({ followers: 1300, followers_start: 1000, followers_end: 1250, growth: 250 });
    expect(byPlatform.get('FACEBOOK')).toMatchObject({ followers_start: 70, followers_end: 90, growth: 20 });
    // Never counted: no growth to report.
    expect(byPlatform.get('YOUTUBE')).toMatchObject({ followers_start: 0, followers_end: 0, growth: 0 });
    expect(social.follower_growth).toBe(270);
    expect(social.daily.followers).toEqual([1000, 1320, 1340]);
  });

  it('counts only the asked networks', async () => {
    const ig = await account('INSTAGRAM', 100);
    const x = await account('X', 50);
    await post(ig, '2026-10-01T06:00:00.000Z', { engagement: 7 });
    await post(x, '2026-10-01T06:00:00.000Z', { engagement: 9 });

    const social = await marketingAnalyticsService.social({ ...WINDOW, platforms: ['X'] });
    expect(social).toMatchObject({ followers: 50, posts: 1, engagement: 9 });
    expect(social.networks.map((row) => row.platform)).toEqual(['X']);
    expect(social.accounts.map((row) => row.platform)).toEqual(['X']);
  });

  it('ranks the best posts by engagement with their account and link', async () => {
    const ig = await account('INSTAGRAM', 100, 'Duncit IG');
    await post(ig, '2026-10-01T06:00:00.000Z', { engagement: 5, text: 'Quiet one' });
    await post(ig, '2026-10-02T06:00:00.000Z', { engagement: 50, views: 900, text: 'Loud one', permalink: 'https://instagram.com/p/1' });

    const { top_posts } = await marketingAnalyticsService.social(WINDOW);
    expect(top_posts.map((row) => row.text)).toEqual(['Loud one', 'Quiet one']);
    expect(top_posts[0]).toMatchObject({
      platform: 'INSTAGRAM',
      account_name: 'Duncit IG',
      permalink: 'https://instagram.com/p/1',
      published_at: '2026-10-02T06:00:00.000Z',
      views: 900,
      engagement: 50,
    });
    expect(top_posts[1]).toMatchObject({ views: 0, permalink: '' });
  });
});
