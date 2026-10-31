/**
 * The publisher against a real database: a due post goes out one network at
 * a time as one run in the marketing run log, the post and the run end by
 * what the networks did, a retry from the run log carries the same run on,
 * and a reviewer's decision on a post waiting for approval puts it in the
 * queue or back in Drafts. The networks, the token refresh and the
 * post-publish sync are mocked.
 */
jest.mock('@modules/crm/marketing/social/providers', () => ({
  PUBLISHERS: { INSTAGRAM: { publish: jest.fn() }, THREADS: { publish: jest.fn() } },
  READERS: { INSTAGRAM: {}, THREADS: {} },
}));
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({ socialCredentials: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.sync', () => ({ freshHandle: jest.fn(), syncSocialAccount: jest.fn() }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { PUBLISHERS } from '../../providers';
import { socialCredentials } from '../../social.credentials';
import { freshHandle, syncSocialAccount } from '../../social.sync';
import { SocialAccountModel } from '../../social.model';
import { SocialScheduledPostModel } from '../../social.publish.model';
import type { PublishMedia } from '../../social.types';
import { MarketingRunModel, type MarketingRunDecision } from '../../../runs/marketingRun.model';
import { marketingRunService } from '../../../runs/marketingRun.service';
import { publishDue, publishNow, requeueFailed } from '../../social.publisher';

const igPublish = PUBLISHERS.INSTAGRAM.publish as jest.Mock;
const threadsPublish = PUBLISHERS.THREADS.publish as jest.Mock;
const IMAGE = 'https://ik.imagekit.io/duncit/post.jpg';
const VIDEO = 'https://ik.imagekit.io/duncit/clip.mp4';
const TEXT = 'Pets of Pune, meet on Sunday';
const HOUR_MS = 3_600_000;

type Platform = 'INSTAGRAM' | 'THREADS' | 'FACEBOOK';
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

describe('carousels', () => {
  it('hands every piece of media to the network, the first doubled as media_url', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const media: PublishMedia[] = [
      { url: IMAGE, type: 'IMAGE' },
      { url: VIDEO, type: 'VIDEO' },
    ];
    const post = await duePost([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], { media });

    await publishDue();

    expect((await stored(post._id))?.status).toBe('PUBLISHED');
    expect(igPublish).toHaveBeenCalledTimes(1);
    const [handle, content, creds] = igPublish.mock.calls[0];
    expect(handle).toEqual({ account_id: String(ig._id), access_token: 'token' });
    expect(content).toEqual({ text: TEXT, media, media_url: IMAGE, media_type: 'IMAGE' });
    expect(creds).toEqual({ app_id: 'app', app_secret: 'secret' });
  });

  it('a post stored before carousels still goes out with its one piece', async () => {
    const th = await account('THREADS', 'Duncit Threads');
    const post = await duePost([{ account_id: String(th._id), platform: 'THREADS' }], { media_type: 'VIDEO' });
    await SocialScheduledPostModel.collection.updateOne({ _id: post._id }, { $unset: { media: '' } });

    await publishDue();

    expect((await stored(post._id))?.status).toBe('PUBLISHED');
    expect(threadsPublish.mock.calls[0][1]).toEqual({ text: TEXT, media: [{ url: IMAGE, type: 'VIDEO' }], media_url: IMAGE, media_type: 'VIDEO' });
  });

  it('a network whose rules refuse the carousel fails that target without being called', async () => {
    const fb = await account('FACEBOOK', 'Duncit Page');
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const media: PublishMedia[] = [
      { url: IMAGE, type: 'IMAGE' },
      { url: VIDEO, type: 'VIDEO' },
    ];
    const post = await duePost(
      [
        { account_id: String(fb._id), platform: 'FACEBOOK' },
        { account_id: String(ig._id), platform: 'INSTAGRAM' },
      ],
      { media }
    );

    await publishDue();

    const sent = await stored(post._id);
    expect(sent?.status).toBe('PARTIAL');
    expect(sent?.targets.map((t) => [t.status, t.error])).toEqual([
      ['FAILED', 'Facebook takes one video on its own, not in a carousel'],
      ['PUBLISHED', ''],
    ]);
    expect(igPublish).toHaveBeenCalledTimes(1);
  });
});

describe('approval decisions', () => {
  const reviewer = { id: new Types.ObjectId().toHexString(), name: 'Ravi Menon' };

  /** A post parked by the composer, with the run a reviewer decides on. */
  const waiting = async (targets: TargetSeed[], over: Record<string, unknown> = {}) => {
    const post = await duePost(targets, { status: 'PENDING_APPROVAL', needs_approval: true, scheduled_at: new Date(Date.now() + HOUR_MS), ...over });
    const run = await MarketingRunModel.create({
      workflow: 'SOCIAL_PUBLISH',
      name: `Approve "${TEXT}" for ${targets.length} network`,
      status: 'AWAITING_APPROVAL',
      actor: { kind: 'USER', id: new Types.ObjectId().toHexString(), name: 'Asha Rao' },
      links: { post_id: String(post._id) },
      approval: { required: true, requested_at: new Date() },
    });
    await SocialScheduledPostModel.updateOne({ _id: post._id }, { $set: { approval_run_id: String(run._id) } });
    return { post, run };
  };

  it('APPROVED puts the post in the queue at its time, under the same run, which completes with an approve step', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const at = new Date(Date.now() + HOUR_MS);
    const { post, run } = await waiting([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], { scheduled_at: at });

    expect(await marketingRunService.decide(String(run._id), 'APPROVED', reviewer, '')).toMatchObject({
      status: 'PENDING',
      approval: { decision: 'APPROVED', decided_by: reviewer.id, decided_by_name: 'Ravi Menon', note: '' },
    });
    await settle();

    const queued = await stored(post._id);
    expect(queued).toMatchObject({ status: 'SCHEDULED', needs_approval: true, approval_run_id: String(run._id), review_note: '' });
    expect(queued?.scheduled_at?.getTime()).toBe(at.getTime());
    const after = await marketingRunService.get(String(run._id));
    expect(after).toMatchObject({ status: 'COMPLETED', error: '', retries: 0 });
    expect(after.steps.map((s) => [s.key, s.label, s.status, s.output_summary, s.error])).toEqual([
      ['approve', 'Approved', 'OK', `scheduled for ${at.toISOString()}`, ''],
    ]);
    expect(after.finished_at).not.toBeNull();
    // Nothing is sent by the decision itself: the scheduler does that at the post's time.
    expect(igPublish).not.toHaveBeenCalled();
  });

  it('APPROVED after the post’s time has passed moves it to now, so the next tick sends it', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const { post, run } = await waiting([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], { scheduled_at: new Date(Date.now() - HOUR_MS) });
    const before = Date.now();

    await marketingRunService.decide(String(run._id), 'APPROVED', reviewer, 'Go ahead');
    await settle();

    const queued = await stored(post._id);
    expect(queued?.status).toBe('SCHEDULED');
    expect(queued?.scheduled_at?.getTime()).toBeGreaterThanOrEqual(before);
    expect(queued?.scheduled_at?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it.each<MarketingRunDecision>(['REJECTED', 'CHANGES_REQUESTED'])(
    '%s sends the post back to Drafts with the reviewer’s note, leaving the cancelled run alone',
    async (decision) => {
      const ig = await account('INSTAGRAM', 'Duncit Pune');
      const { post, run } = await waiting([{ account_id: String(ig._id), platform: 'INSTAGRAM' }]);

      await marketingRunService.decide(String(run._id), decision, reviewer, 'Wrong date in the caption');
      await settle();

      expect(await stored(post._id)).toMatchObject({
        status: 'DRAFT',
        review_note: 'Wrong date in the caption',
        needs_approval: true,
        approval_run_id: String(run._id),
      });
      expect(await marketingRunService.get(String(run._id))).toMatchObject({
        status: 'CANCELLED',
        steps: [],
        approval: { decision, note: 'Wrong date in the caption', decided_by_name: 'Ravi Menon' },
      });
      expect(await MarketingRunModel.countDocuments({})).toBe(1);
      expect(igPublish).not.toHaveBeenCalled();
    }
  );

  it('a yes for a run the post no longer waits on changes nothing, and closes that run', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const { post, run } = await waiting([{ account_id: String(ig._id), platform: 'INSTAGRAM' }]);
    // Re-submitted under a newer run in the meantime.
    const newer = new Types.ObjectId().toHexString();
    await SocialScheduledPostModel.updateOne({ _id: post._id }, { $set: { approval_run_id: newer } });

    await marketingRunService.decide(String(run._id), 'APPROVED', reviewer, '');
    await settle();

    expect(await stored(post._id)).toMatchObject({ status: 'PENDING_APPROVAL', approval_run_id: newer });
    expect(await marketingRunService.get(String(run._id))).toMatchObject({
      status: 'CANCELLED',
      steps: [],
      error: 'The post is no longer waiting for this approval.',
    });
    expect(warn).toHaveBeenCalledWith(
      'social-publisher',
      'onDecision',
      expect.objectContaining({ run_id: String(run._id), post_id: String(post._id), decision: 'APPROVED' })
    );
  });

  it('a no for a post that was deleted meanwhile only logs; decideRun had closed the run', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    const run = await MarketingRunModel.create({
      workflow: 'SOCIAL_PUBLISH',
      name: 'Approve',
      status: 'AWAITING_APPROVAL',
      links: { post_id: new Types.ObjectId().toHexString() },
      approval: { required: true },
    });

    await marketingRunService.decide(String(run._id), 'REJECTED', reviewer, 'Gone anyway');
    await settle();

    expect(await marketingRunService.get(String(run._id))).toMatchObject({ status: 'CANCELLED', error: '' });
    expect(warn).toHaveBeenCalledWith('social-publisher', 'onDecision', expect.objectContaining({ decision: 'REJECTED' }));
  });

  it('the publish run of an approved post hangs under its approval run', async () => {
    const ig = await account('INSTAGRAM', 'Duncit Pune');
    const { post, run } = await waiting([{ account_id: String(ig._id), platform: 'INSTAGRAM' }], { scheduled_at: new Date(Date.now() - HOUR_MS) });
    await marketingRunService.decide(String(run._id), 'APPROVED', reviewer, '');
    await settle();

    await publishDue();

    expect((await stored(post._id))?.status).toBe('PUBLISHED');
    const publishRun = await MarketingRunModel.findOne({ parent_run_id: String(run._id) }).lean();
    expect(publishRun).toMatchObject({
      workflow: 'SOCIAL_PUBLISH',
      trigger: 'SCHEDULE',
      status: 'COMPLETED',
      name: `Publish "${TEXT}" to 1 network`,
      links: { post_id: String(post._id) },
    });
    expect(await MarketingRunModel.countDocuments({})).toBe(2);
    // A post that needed no approval publishes under no parent.
    const plain = await duePost([{ account_id: String(ig._id), platform: 'INSTAGRAM' }]);
    await publishDue();
    expect(await MarketingRunModel.findOne({ 'links.post_id': String(plain._id) }).lean()).toMatchObject({ parent_run_id: '' });
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
