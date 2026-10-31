import { Types } from 'mongoose';
import { marketingAnalyticsService } from '../../marketingAnalytics.service';
import { SocialPostModel } from '../../../social/social.model';
import { SocialScheduledPostModel } from '../../../social/social.publish.model';
import { ReelProjectModel } from '@modules/ai/reel/reel.model';

const WINDOW = { from: '2026-10-01', to: '2026-10-07' };
const INSIDE = new Date('2026-10-02T06:00:00.000Z');
const BEFORE = new Date('2026-09-20T06:00:00.000Z');

const IMAGE = { url: 'https://cdn.duncit.com/a.jpg', type: 'IMAGE' };
const VIDEO = { url: 'https://cdn.duncit.com/a.mp4', type: 'VIDEO' };

let seq = 0;
const target = (platform: string, over: Record<string, unknown> = {}) => {
  seq += 1;
  return { account_id: `acc-${platform}`, platform, status: 'PUBLISHED', external_id: `ext-${seq}`, published_at: INSIDE, ...over };
};

const duncitPost = (over: Record<string, unknown> = {}) =>
  SocialScheduledPostModel.create({ text: 'From Duncit', status: 'PUBLISHED', published_at: INSIDE, targets: [target('INSTAGRAM')], ...over });

/** What the account sync reads back for a target once the network has it. */
const synced = (tgt: { account_id: string; platform: string; external_id: string }, views: number | null, engagement: number, at = INSIDE) =>
  SocialPostModel.create({ account_id: tgt.account_id, platform: tgt.platform, external_id: tgt.external_id, published_at: at, views, engagement });

describe('marketingAnalyticsService.content', () => {
  it('reads an empty window as zeros, with every format and slot present', async () => {
    const content = await marketingAnalyticsService.content(WINDOW);
    expect(content).toMatchObject({ from_duncit: 0, from_networks: 0, reels_made: 0, reels_posted: 0, reel_views: 0, reel_engagement: 0 });
    expect(content.formats).toEqual(
      ['CAROUSEL', 'VIDEO', 'SINGLE', 'TEXT'].map((format) => ({ format, posts: 0, networks: 0, views: 0, engagement: 0 }))
    );
    expect(content.top_reels).toEqual([]);
    expect(content.by_weekday).toEqual(new Array(7).fill(0));
    expect(content.by_hour).toEqual(new Array(24).fill(0));
    expect(content.best_weekday).toBeNull();
    expect(content.best_hour).toBeNull();
  });

  it('counts Duncit posts that went out against posts read from the networks', async () => {
    await duncitPost();
    await duncitPost({ status: 'PARTIAL' });
    // Not out, or out before the window: not counted.
    await duncitPost({ status: 'FAILED' });
    await duncitPost({ status: 'SCHEDULED', published_at: null });
    await duncitPost({ published_at: BEFORE });
    await SocialPostModel.create({ account_id: 'acc-1', platform: 'FACEBOOK', external_id: 'native-1', published_at: INSIDE });
    await SocialPostModel.create({ account_id: 'acc-1', platform: 'FACEBOOK', external_id: 'native-2', published_at: BEFORE });

    const content = await marketingAnalyticsService.content(WINDOW);
    expect(content.from_duncit).toBe(2);
    expect(content.from_networks).toBe(1);
  });

  it('splits Duncit posts by format, with what every network they reached reported', async () => {
    const carouselTargets = [target('INSTAGRAM'), target('FACEBOOK')];
    await duncitPost({ media: [IMAGE, IMAGE], media_type: 'IMAGE', targets: carouselTargets });
    await synced(carouselTargets[0], 300, 30);
    await synced(carouselTargets[1], null, 12);
    const videoTarget = target('YOUTUBE');
    await duncitPost({ media: [VIDEO], media_type: 'VIDEO', targets: [videoTarget] });
    await synced(videoTarget, 1000, 80);
    // A single picture whose network has not been synced yet: reached, with zeros.
    await duncitPost({ media: [IMAGE], media_type: 'IMAGE' });
    // A failed target reached nobody.
    await duncitPost({ status: 'PARTIAL', targets: [target('X'), target('THREADS', { status: 'FAILED' })] });

    const byFormat = new Map((await marketingAnalyticsService.content(WINDOW)).formats.map((row) => [row.format, row]));
    expect(byFormat.get('CAROUSEL')).toEqual({ format: 'CAROUSEL', posts: 1, networks: 2, views: 300, engagement: 42 });
    expect(byFormat.get('VIDEO')).toEqual({ format: 'VIDEO', posts: 1, networks: 1, views: 1000, engagement: 80 });
    expect(byFormat.get('SINGLE')).toEqual({ format: 'SINGLE', posts: 1, networks: 1, views: 0, engagement: 0 });
    expect(byFormat.get('TEXT')).toEqual({ format: 'TEXT', posts: 1, networks: 1, views: 0, engagement: 0 });
  });

  it('keeps only the asked networks', async () => {
    const both = [target('INSTAGRAM'), target('FACEBOOK')];
    await duncitPost({ targets: both });
    await synced(both[0], 100, 10);
    await synced(both[1], 50, 5);
    await duncitPost({ targets: [target('X')] });

    const content = await marketingAnalyticsService.content({ ...WINDOW, platforms: ['FACEBOOK'] });
    expect(content.from_duncit).toBe(1);
    expect(content.formats.find((row) => row.format === 'TEXT')).toEqual({ format: 'TEXT', posts: 1, networks: 1, views: 50, engagement: 5 });
    expect(content.from_networks).toBe(1);
  });

  it('counts reels made and posted, with their views summed and the most viewed first', async () => {
    const big = await ReelProjectModel.create({ name: 'Diwali reel' });
    const small = await ReelProjectModel.create({ name: 'Monsoon reel' });
    // Timestamps stamp "now" on create; the window is in the past, so set them where the story needs them.
    await ReelProjectModel.collection.updateOne({ _id: big._id }, { $set: { created_at: INSIDE } });
    await ReelProjectModel.collection.updateOne({ _id: small._id }, { $set: { created_at: BEFORE } });
    const bigTargets = [target('INSTAGRAM'), target('YOUTUBE')];
    await duncitPost({ reel_project_id: String(big._id), media: [VIDEO], media_type: 'VIDEO', targets: bigTargets });
    await synced(bigTargets[0], 2000, 100);
    await synced(bigTargets[1], 500, 20);
    const smallTarget = target('INSTAGRAM');
    await duncitPost({ reel_project_id: String(small._id), media: [VIDEO], media_type: 'VIDEO', targets: [smallTarget] });
    await synced(smallTarget, 300, 9);
    // Posted from a project deleted since: numbers kept, no name.
    const goneTarget = target('INSTAGRAM');
    await duncitPost({ reel_project_id: new Types.ObjectId().toString(), targets: [goneTarget] });
    await synced(goneTarget, 10, 1);

    const content = await marketingAnalyticsService.content(WINDOW);
    expect(content.reels_made).toBe(1);
    expect(content.reels_posted).toBe(3);
    expect(content.reel_views).toBe(2810);
    expect(content.reel_engagement).toBe(130);
    expect(content.top_reels.map((row) => [row.name, row.networks, row.views, row.engagement])).toEqual([
      ['Diwali reel', 2, 2500, 120],
      ['Monsoon reel', 1, 300, 9],
      ['', 1, 10, 1],
    ]);
  });

  it('finds the best weekday and hour by average engagement per post, in the admin zone', async () => {
    // Fri 2 Oct 2026 at 11:30 IST, twice, averaging 10.
    await SocialPostModel.create({ account_id: 'a', platform: 'INSTAGRAM', external_id: 'p1', published_at: new Date('2026-10-02T06:00:00.000Z'), engagement: 5 });
    await SocialPostModel.create({ account_id: 'a', platform: 'INSTAGRAM', external_id: 'p2', published_at: new Date('2026-10-02T06:10:00.000Z'), engagement: 15 });
    // Sun 4 Oct at 00:30 IST (still Saturday in UTC): one post of 40.
    await SocialPostModel.create({ account_id: 'a', platform: 'INSTAGRAM', external_id: 'p3', published_at: new Date('2026-10-03T19:00:00.000Z'), engagement: 40 });

    const content = await marketingAnalyticsService.content(WINDOW);
    expect(content.by_weekday).toEqual([0, 0, 0, 0, 10, 0, 40]);
    expect(content.best_weekday).toBe(6);
    expect(content.by_hour[11]).toBe(10);
    expect(content.by_hour[0]).toBe(40);
    expect(content.best_hour).toBe(0);
  });
});
