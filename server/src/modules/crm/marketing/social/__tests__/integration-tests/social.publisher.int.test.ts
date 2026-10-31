/**
 * The publisher against a real database: a due post goes out one network at
 * a time as one run in the marketing run log, the post and the run end by
 * what the networks did, and a retry from the run log carries the same run
 * on. The networks, the token refresh and the post-publish sync are mocked.
 */
jest.mock('@modules/crm/marketing/social/providers', () => ({
  PUBLISHERS: { INSTAGRAM: { publish: jest.fn() }, THREADS: { publish: jest.fn() } },
  READERS: { INSTAGRAM: {}, THREADS: {} },
}));
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({ socialCredentials: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.sync', () => ({ freshHandle: jest.fn(), syncSocialAccount: jest.fn() }));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PUBLISHERS } from '../../providers';
import { socialCredentials } from '../../social.credentials';
import { freshHandle, syncSocialAccount } from '../../social.sync';
import { SocialAccountModel } from '../../social.model';
import { SocialScheduledPostModel } from '../../social.publish.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { marketingRunService } from '../../../runs/marketingRun.service';
import { publishDue, publishNow, requeueFailed } from '../../social.publisher';

const igPublish = PUBLISHERS.INSTAGRAM.publish as jest.Mock;
const threadsPublish = PUBLISHERS.THREADS.publish as jest.Mock;
const IMAGE = 'https://ik.imagekit.io/duncit/post.jpg';
const HOUR_MS = 3_600_000;

type Platform = 'INSTAGRAM' | 'THREADS';
interface TargetSeed {
  account_id: string;
  platform: Platform;
  status?: string;
  error?: string;
}

const account = (platform: Platform, name: string) =>
  SocialAccountModel.create({ provider: platform, platform, external_id: `${platform}-${new Types.ObjectId().toHexString()}`, name });

const duePost = (targets: TargetSeed[], over: Record<string, unknown> = {}) =>
  SocialScheduledPostModel.create({
    text: 'Pets of Pune, meet on Sunday',
    media_url: IMAGE,
    media_type: 'IMAGE',
    status: 'SCHEDULED',
    scheduled_at: new Date(Date.now() - 1000),
    targets: targets.map((target) => ({ status: 'PENDING', ...target })),
    ...over,
  });

const stored = (id: unknown) => SocialScheduledPostModel.findById(id).lean();
const onlyRun = async () => (await marketingRunService.table()).rows[0];
/** The retry handler runs after the mutation answers. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

beforeEach(() => {
  igPublish.mockReset().mockResolvedValue({ external_id: 'ig-1', permalink: 'https://instagram.com/p/1' });
  threadsPublish.mockReset().mockResolvedValue({ external_id: 'th-1', permalink: 'https://threads.net/p/1' });
  (socialCredentials as jest.Mock).mockReset().mockResolvedValue({ app_id: 'app', app_secret: 'secret' });
  (freshHandle as jest.Mock)
    .mockReset()
    .mockImplementation(async (doc: { _id: unknown }) => ({ account_id: String(doc._id), access_token: 'token' }));
  (syncSocialAccount as jest.Mock).mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await Promise.all([
    SocialAccountModel.deleteMany({}),
    SocialScheduledPostModel.deleteMany({}),
    MarketingRunModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe('publishDue', () => {
  it('sends each pending target as a step of one scheduled run, and the post ends by what the networks did', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const th = await account('THREADS', 'Duncit Threads');
    threadsPublish.mockRejectedValue(new Error('rate limited'));
    const post = await duePost([
      { account_id: String(ig._id), platform: 'INSTAGRAM' },
      { account_id: String(th._id), platform: 'THREADS' },
    ]);

    await publishDue();

    const sent = await stored(post._id);
    expect(sent?.status).toBe('PARTIAL');
    expect(sent?.published_at).not.toBeNull();
    expect(sent?.targets.map((t) => [t.status, t.permalink, t.error])).toEqual([
      ['PUBLISHED', 'https://instagram.com/p/1', ''],
      ['FAILED', '', 'rate limited'],
    ]);
    // Only the network that took the post is synced for it.
    expect(syncSocialAccount).toHaveBeenCalledTimes(1);
    expect(syncSocialAccount).toHaveBeenCalledWith(String(ig._id));

    const run = await onlyRun();
    expect(run).toMatchObject({
      workflow: 'SOCIAL_PUBLISH',
      trigger: 'SCHEDULE',
      status: 'PARTIAL',
      name: 'Publish "Pets of Pune, meet on Sunday" to 2 networks',
      links: { post_id: String(post._id) },
      actor: { kind: 'SYSTEM' },
      can_retry: true,
    });
    expect(run.steps.map((s) => [s.key, s.label, s.status, s.tool, s.output_summary, s.error])).toEqual([
      [`instagram:${ig._id}`, 'INSTAGRAM · Duncit Pune', 'OK', 'instagram.publish', 'https://instagram.com/p/1', ''],
      [`threads:${th._id}`, 'THREADS · Duncit Threads', 'FAILED', 'threads.publish', '', 'rate limited'],
    ]);
    expect(run.steps[0].input_summary).toBe('Pets of Pune, meet on Sunday');
  });

  it('leaves a post whose time has not come, and records no run for an idle tick', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const later = await duePost([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], {
      scheduled_at: new Date(Date.now() + HOUR_MS),
    });

    await publishDue();

    expect(igPublish).not.toHaveBeenCalled();
    expect((await stored(later._id))?.status).toBe('SCHEDULED');
    expect(await MarketingRunModel.countDocuments({})).toBe(0);
  });

  it('a crash before anything is sent fails the run and every unsent target', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const post = await duePost([{ account_id: String(ig._id), platform: 'INSTAGRAM' }]);
    jest.spyOn(SocialAccountModel, 'find').mockImplementationOnce(() => {
      throw new Error('db down');
    });

    await publishDue();

    const sent = await stored(post._id);
    expect(sent).toMatchObject({ status: 'FAILED', published_at: null });
    expect(sent?.targets[0]).toMatchObject({ status: 'FAILED', error: 'db down' });
    expect(await onlyRun()).toMatchObject({ status: 'FAILED', error: 'db down', steps: [] });
  });

  it('a target whose account is gone fails on its own; the others still go out', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const gone = new Types.ObjectId().toHexString();
    const post = await duePost([
      { account_id: gone, platform: 'THREADS' },
      { account_id: String(ig._id), platform: 'INSTAGRAM' },
    ]);

    await publishDue();

    const sent = await stored(post._id);
    expect(sent?.status).toBe('PARTIAL');
    expect(sent?.targets.map((t) => [t.status, t.error])).toEqual([
      ['FAILED', 'This account was disconnected before the post went out.'],
      ['PUBLISHED', ''],
    ]);
    const run = await onlyRun();
    // The step keeps the id as its name — there is no account left to name it.
    expect(run.steps.map((s) => [s.label, s.status])).toEqual([
      [`THREADS · ${gone}`, 'FAILED'],
      ['INSTAGRAM · Duncit Pune', 'OK'],
    ]);
  });
});

describe('publishNow', () => {
  it('records who asked, and completes when every network took the post', async () => {
    const userId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      profile: { first_name: 'Asha', last_name: 'Rao' },
      auth: { email: 'asha@duncit.test' },
    });
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const post = await duePost([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], {
      scheduled_at: new Date(Date.now() + HOUR_MS),
    });

    await publishNow(String(post._id), String(userId));

    expect((await stored(post._id))?.status).toBe('PUBLISHED');
    expect(await onlyRun()).toMatchObject({
      trigger: 'USER',
      status: 'COMPLETED',
      actor: { kind: 'USER', id: String(userId), name: 'Asha Rao', email: 'asha@duncit.test' },
      can_retry: false,
    });
  });

  it('does nothing for a post that is not waiting', async () => {
    const draft = await duePost([], { status: 'DRAFT', scheduled_at: null });
    await publishNow(String(draft._id));
    expect(igPublish).not.toHaveBeenCalled();
    expect(await MarketingRunModel.countDocuments({})).toBe(0);
  });
});

describe('retry from the run log', () => {
  it('queues the failed targets again and carries the same run on', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const th = await account('THREADS', 'Duncit Threads');
    threadsPublish.mockRejectedValueOnce(new Error('rate limited'));
    const post = await duePost([
      { account_id: String(ig._id), platform: 'INSTAGRAM' },
      { account_id: String(th._id), platform: 'THREADS' },
    ]);
    await publishDue();
    const run = await onlyRun();
    expect(run.status).toBe('PARTIAL');

    expect(await marketingRunService.retry(run.id)).toMatchObject({ status: 'PENDING', retries: 1 });
    await settle();

    const sent = await stored(post._id);
    expect(sent?.status).toBe('PUBLISHED');
    expect(sent?.targets.map((t) => t.status)).toEqual(['PUBLISHED', 'PUBLISHED']);
    // Instagram already had the post; only Threads was sent again.
    expect(igPublish).toHaveBeenCalledTimes(1);
    expect(threadsPublish).toHaveBeenCalledTimes(2);
    const after = await marketingRunService.get(run.id);
    expect(after).toMatchObject({ status: 'COMPLETED', retries: 1, error: '' });
    expect(after.steps.map((s) => [s.key, s.status, s.error])).toEqual([
      [`instagram:${ig._id}`, 'OK', ''],
      [`threads:${th._id}`, 'OK', ''],
    ]);
    expect(await MarketingRunModel.countDocuments({})).toBe(1);
  });

  it('fails the run again when its post has nothing left to send', async () => {
    const run = await MarketingRunModel.create({
      workflow: 'SOCIAL_PUBLISH',
      name: 'Publish',
      status: 'FAILED',
      links: { post_id: new Types.ObjectId().toHexString() },
    });

    await marketingRunService.retry(String(run._id));
    await settle();

    expect(await marketingRunService.get(String(run._id))).toMatchObject({
      status: 'FAILED',
      retries: 1,
      error: 'The post has nothing left to retry.',
    });
    expect(igPublish).not.toHaveBeenCalled();
  });
});

describe('requeueFailed', () => {
  it('resets only the failed targets, and refuses a post with nothing failed', async () => {
    const post = await duePost(
      [
        { account_id: 'a', platform: 'INSTAGRAM', status: 'PUBLISHED' },
        { account_id: 'b', platform: 'THREADS', status: 'FAILED', error: 'rate limited' },
      ],
      { status: 'PARTIAL', scheduled_at: new Date(0) },
    );

    expect(await requeueFailed(String(post._id))).toBe(true);
    const queued = await stored(post._id);
    expect(queued?.status).toBe('SCHEDULED');
    expect(queued?.targets.map((t) => [t.status, t.error])).toEqual([
      ['PUBLISHED', ''],
      ['PENDING', ''],
    ]);
    expect(queued?.scheduled_at?.getTime()).toBeGreaterThan(Date.now() - 5000);

    expect(await requeueFailed(String(post._id))).toBe(false);
    expect(await requeueFailed('nope')).toBe(false);
  });
});
