/**
 * The composer's side of social publishing against a real database: the
 * draft / schedule / now rules, every edit path, retries and the calendar.
 * Only the network send (publishNow) is mocked — it runs in the background.
 */
jest.mock('@modules/crm/marketing/social/social.publisher', () => ({ publishNow: jest.fn() }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { publishNow } from '../../social.publisher';
import { SocialAccountModel, SocialPostModel } from '../../social.model';
import { SocialIdeaModel, SocialScheduledPostModel } from '../../social.publish.model';
import { socialPublishService as svc, type ScheduledPostInput } from '../../social.publish.service';

const send = publishNow as jest.Mock;
const USER = new Types.ObjectId().toHexString();
const IMAGE = 'https://ik.imagekit.io/duncit/post.jpg';
const MINUTE = 60_000;
// Valid ids that match no stored account — names fall back to ''.
const GONE_A = new Types.ObjectId().toHexString();
const GONE_B = new Types.ObjectId().toHexString();

const account = (platform: string, over: Record<string, unknown> = {}) =>
  SocialAccountModel.create({
    provider: platform === 'FACEBOOK' || platform === 'INSTAGRAM' ? 'META' : platform,
    platform,
    external_id: `${platform}-${new Types.ObjectId().toHexString()}`,
    name: `Duncit ${platform}`,
    ...over,
  });

const input = (over: Partial<ScheduledPostInput>): ScheduledPostInput => ({
  text: 'Hello pets',
  account_ids: [],
  mode: 'DRAFT',
  ...over,
});

const future = () => new Date(Date.now() + 60 * MINUTE).toISOString();

const post = (over: Record<string, unknown>) =>
  SocialScheduledPostModel.create({ text: 'p', status: 'DRAFT', ...over });

beforeEach(() => {
  send.mockReset().mockResolvedValue(undefined);
});

describe('create — drafts', () => {
  it('keeps a half-written draft with no accounts and no media', async () => {
    const out = await svc.create(input({ text: '  ', media_url: null }), USER);
    expect(out).toMatchObject({ text: '', media_url: '', media_type: null, status: 'DRAFT', scheduled_at: null, idea_id: '', targets: [] });
    expect(send).not.toHaveBeenCalled();
    const saved = await SocialScheduledPostModel.findById(out.id).lean();
    expect(String(saved?.created_by)).toBe(USER);
  });

  it('lets a draft carry a date and media a network would refuse', async () => {
    const yt = await account('YOUTUBE');
    const at = '2020-01-01T10:00:00.000Z';
    const out = await svc.create(input({ text: '', media_url: ` ${IMAGE} `, account_ids: [String(yt._id)], scheduled_at: at }), USER);
    expect(out).toMatchObject({ media_url: IMAGE, media_type: 'IMAGE', scheduled_at: at, status: 'DRAFT' });
    expect(out.targets).toEqual([
      { account_id: String(yt._id), account_name: 'Duncit YOUTUBE', platform: 'YOUTUBE', status: 'PENDING', permalink: '', error: '', published_at: null },
    ]);
  });

  it('refuses an unreadable date even on a draft', async () => {
    await expect(svc.create(input({ scheduled_at: 'tomorrow-ish' }), USER)).rejects.toMatchObject({
      message: 'That date and time could not be read.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('marks the idea it came from as used, and ignores a malformed idea id', async () => {
    const idea = await SocialIdeaModel.create({ title: 'Dog park meetup' });
    const out = await svc.create(input({ idea_id: String(idea._id) }), USER);
    expect(out.idea_id).toBe(String(idea._id));
    expect((await SocialIdeaModel.findById(idea._id).lean())?.status).toBe('USED');

    await expect(svc.create(input({ idea_id: 'not-an-id' }), USER)).resolves.toMatchObject({ idea_id: 'not-an-id' });
  });
});

describe('create — scheduling checks', () => {
  it.each([
    ['no account', {}, 'Pick at least one account to post to.'],
    ['untrusted media', { media_url: 'https://evil.example/x.jpg' }, 'Pick the image or video with the media picker — only Duncit’s own media can be posted.'],
    ['non-https media', { media_url: 'http://ik.imagekit.io/x.jpg' }, 'Pick the image or video with the media picker — only Duncit’s own media can be posted.'],
  ])('refuses %s', async (_label, patch, message) => {
    const x = await account('X');
    const ids = (patch as Record<string, unknown>).media_url ? [String(x._id)] : [];
    await expect(svc.create(input({ mode: 'SCHEDULE', scheduled_at: future(), account_ids: ids, ...patch }), USER)).rejects.toMatchObject({
      message,
    });
    expect(await SocialScheduledPostModel.countDocuments()).toBe(0);
  });

  it('refuses a malformed or disconnected account id', async () => {
    await expect(svc.create(input({ mode: 'DRAFT', account_ids: ['bad'] }), USER)).rejects.toThrow(
      'One of the chosen accounts is not valid.'
    );
    await expect(
      svc.create(input({ mode: 'DRAFT', account_ids: [new Types.ObjectId().toHexString()] }), USER)
    ).rejects.toThrow('One of the chosen accounts is no longer connected.');
  });

  it('lists every distinct rule each target breaks, once', async () => {
    const x1 = await account('X');
    const x2 = await account('X');
    const yt = await account('YOUTUBE');
    const long = 'a'.repeat(281);
    const err = await svc
      .create(input({ mode: 'SCHEDULE', scheduled_at: future(), text: long, account_ids: [String(x1._id), String(x2._id), String(yt._id)] }), USER)
      .catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    const parts = (err as Error).message.replace(/\.$/, '').split('. ');
    expect(parts.sort((a, b) => a.localeCompare(b))).toEqual(['X allows 280 characters', 'YouTube needs video media']);
    expect(await SocialScheduledPostModel.countDocuments()).toBe(0);
  });

  it('asks to reconnect expired accounts by name', async () => {
    const li = await account('LINKEDIN', { status: 'EXPIRED', name: 'Duncit LI' });
    const fb = await account('FACEBOOK', { status: 'EXPIRED', name: 'Duncit FB' });
    await expect(
      svc.create(input({ mode: 'SCHEDULE', scheduled_at: future(), account_ids: [String(li._id), String(fb._id)] }), USER)
    ).rejects.toThrow(/^Reconnect (Duncit LI, Duncit FB|Duncit FB, Duncit LI) before posting to it\.$/);
  });

  it.each([
    ['missing', undefined],
    ['well in the past', new Date(Date.now() - 5 * MINUTE).toISOString()],
  ])('refuses a schedule time that is %s', async (_label, at) => {
    const x = await account('X');
    await expect(svc.create(input({ mode: 'SCHEDULE', scheduled_at: at, account_ids: [String(x._id)] }), USER)).rejects.toThrow(
      'Pick a time in the future to schedule this post.'
    );
  });

  it('accepts a time inside the one-minute grace and dedupes repeated accounts', async () => {
    const x = await account('X');
    const at = new Date(Date.now() - 30_000).toISOString();
    const out = await svc.create(input({ mode: 'SCHEDULE', scheduled_at: at, account_ids: [String(x._id), String(x._id)] }), USER);
    expect(out.status).toBe('SCHEDULED');
    expect(out.scheduled_at).toBe(at);
    expect(out.targets).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a NOW post in the background and logs a failed send', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    send.mockRejectedValue(new Error('network down'));
    const fb = await account('FACEBOOK');
    const before = Date.now();
    const out = await svc.create(input({ mode: 'NOW', account_ids: [String(fb._id)], media_url: IMAGE, media_type: 'VIDEO' }), USER);
    expect(out).toMatchObject({ status: 'SCHEDULED', media_type: 'VIDEO' });
    expect(new Date(out.scheduled_at as string).getTime()).toBeGreaterThanOrEqual(before);
    expect(send).toHaveBeenCalledWith(out.id);
    for (let i = 0; i < 200 && error.mock.calls.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    expect(error).toHaveBeenCalledWith('social-publish', 'publishNow', {
      error: expect.any(Error),
      post_id: out.id,
      msg: 'publish now failed',
    });
    error.mockRestore();
  });
});

describe('list / get', () => {
  it('shows each view with its own statuses and order', async () => {
    const x = await account('X');
    const target = { account_id: String(x._id), platform: 'X' };
    const ghost = { account_id: new Types.ObjectId().toHexString(), platform: 'X' };
    const later = await post({ status: 'SCHEDULED', scheduled_at: new Date('2030-01-02'), targets: [target] });
    const sooner = await post({ status: 'PUBLISHING', scheduled_at: new Date('2030-01-01'), targets: [ghost] });
    await post({ status: 'DRAFT' });
    await post({ status: 'PUBLISHED' });
    await post({ status: 'PARTIAL' });
    await post({ status: 'FAILED' });

    const queue = await svc.list('QUEUE');
    expect(queue.map((p) => p.id)).toEqual([String(sooner._id), String(later._id)]);
    expect(queue[0].targets[0].account_name).toBe('');
    expect(queue[1].targets[0].account_name).toBe('Duncit X');
    expect((await svc.list('DRAFTS')).map((p) => p.status)).toEqual(['DRAFT']);
    expect((await svc.list('SENT')).map((p) => p.status).sort((a, b) => a.localeCompare(b))).toEqual(['FAILED', 'PARTIAL', 'PUBLISHED']);
  });

  it('reads one post, and reports a bad or unknown id as not found', async () => {
    const p = await post({ text: 'one' });
    expect((await svc.get(String(p._id))).text).toBe('one');
    for (const id of ['nope', new Types.ObjectId().toHexString()]) {
      await expect(svc.get(id)).rejects.toMatchObject({ message: 'Post not found', extensions: { code: 'NOT_FOUND' } });
    }
  });
});

describe('update', () => {
  it('rewrites a draft into a schedule with checked targets', async () => {
    const x = await account('X');
    const p = await post({ text: 'old' });
    const at = future();
    const out = await svc.update(String(p._id), input({ text: 'new', mode: 'SCHEDULE', scheduled_at: at, account_ids: [String(x._id)] }), USER);
    expect(out).toMatchObject({ text: 'new', status: 'SCHEDULED', scheduled_at: at });
    expect(out.targets.map((t) => t.platform)).toEqual(['X']);
    expect(String((await SocialScheduledPostModel.findById(p._id).lean())?.updated_by)).toBe(USER);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends right away when switched to NOW', async () => {
    const x = await account('X');
    const p = await post({ status: 'SCHEDULED', scheduled_at: new Date('2030-01-01') });
    await svc.update(String(p._id), input({ mode: 'NOW', account_ids: [String(x._id)] }), USER);
    expect(send).toHaveBeenCalledWith(String(p._id));
  });

  it.each(['PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED'])('refuses to edit a %s post', async (status) => {
    const p = await post({ status });
    await expect(svc.update(String(p._id), input({}), USER)).rejects.toThrow('Only a draft or a scheduled post can be edited.');
  });
});

describe('remove / shareNow / retry', () => {
  it('deletes a post unless it is going out right now', async () => {
    const draft = await post({ status: 'PUBLISHED' });
    expect(await svc.remove(String(draft._id))).toBe(true);
    expect(await SocialScheduledPostModel.countDocuments()).toBe(0);

    const busy = await post({ status: 'PUBLISHING' });
    await expect(svc.remove(String(busy._id))).rejects.toThrow('This post is going out right now — wait for it to finish.');
    expect(await SocialScheduledPostModel.countDocuments()).toBe(1);
  });

  it('shares a scheduled post now', async () => {
    const p = await post({ status: 'SCHEDULED', scheduled_at: new Date('2030-01-01') });
    const before = Date.now();
    const out = await svc.shareNow(String(p._id));
    expect(new Date(out.scheduled_at as string).getTime()).toBeGreaterThanOrEqual(before);
    expect(send).toHaveBeenCalledWith(String(p._id));

    const draft = await post({ status: 'DRAFT' });
    await expect(svc.shareNow(String(draft._id))).rejects.toThrow('Only a scheduled post can be shared now.');
  });

  it('requeues only the failed targets of a partial post', async () => {
    const p = await post({
      status: 'PARTIAL',
      targets: [
        { account_id: GONE_A, platform: 'X', status: 'PUBLISHED', permalink: 'https://x.com/1' },
        { account_id: GONE_B, platform: 'LINKEDIN', status: 'FAILED', error: 'token expired' },
      ],
    });
    const out = await svc.retry(String(p._id));
    expect(out.status).toBe('SCHEDULED');
    expect(out.targets.map((t) => [t.status, t.error, t.permalink])).toEqual([
      ['PUBLISHED', '', 'https://x.com/1'],
      ['PENDING', '', ''],
    ]);
    expect(send).toHaveBeenCalledWith(String(p._id));
  });

  it.each(['DRAFT', 'SCHEDULED', 'PUBLISHED'])('refuses to retry a %s post', async (status) => {
    const p = await post({ status });
    await expect(svc.retry(String(p._id))).rejects.toThrow('Only a post that failed somewhere can be retried.');
    expect(send).not.toHaveBeenCalled();
  });
});

describe('calendar', () => {
  const FROM = '2026-03-01T00:00:00.000Z';
  const TO = '2026-04-01T00:00:00.000Z';

  it.each([
    ['garbage', TO],
    [FROM, 'garbage'],
    [TO, FROM],
    [FROM, FROM],
  ])('refuses the range %s → %s', async (from, to) => {
    await expect(svc.calendar(from, to)).rejects.toThrow('That date range could not be read.');
  });

  it('merges planned and synced posts, showing a post sent from here only once', async () => {
    const x = await account('X', { name: 'Duncit X' });
    const xId = String(x._id);
    await post({
      text: 'sent here',
      status: 'PUBLISHED',
      scheduled_at: new Date('2026-02-28T00:00:00Z'),
      published_at: new Date('2026-03-05T00:00:00Z'),
      targets: [
        { account_id: xId, platform: 'X', status: 'PUBLISHED', external_id: 'tw-1', permalink: '' },
        { account_id: GONE_A, platform: 'X', status: 'PUBLISHED', external_id: 'tw-2', permalink: 'https://x.com/2' },
      ],
    });
    await post({ text: 'planned', status: 'DRAFT', scheduled_at: new Date('2026-03-10T00:00:00Z') });
    await post({ text: 'outside', status: 'SCHEDULED', scheduled_at: new Date('2026-05-01T00:00:00Z') });
    const base = { account_id: xId, platform: 'X' };
    await SocialPostModel.create({ ...base, external_id: 'tw-1', published_at: new Date('2026-03-05T00:00:00Z') });
    await SocialPostModel.create({ ...base, external_id: 'tw-9', text: 'organic', permalink: 'https://x.com/9', engagement: 12, published_at: new Date('2026-03-20T00:00:00Z') });
    await SocialPostModel.collection.insertOne({ account_id: GONE_A, platform: 'X', external_id: 'tw-8', published_at: new Date('2026-03-21T00:00:00Z') });
    await SocialPostModel.create({ ...base, external_id: 'tw-old', published_at: new Date('2026-01-01T00:00:00Z') });

    const items = await svc.calendar(FROM, TO);
    const planned = items.filter((i) => i.kind === 'PLANNED');
    const synced = items.filter((i) => i.kind === 'PUBLISHED');

    const sent = planned.find((i) => i.text === 'sent here');
    expect(sent).toMatchObject({
      at: '2026-03-05T00:00:00.000Z',
      status: 'PUBLISHED',
      permalink: 'https://x.com/2',
      platforms: ['X', 'X'],
      account_names: ['Duncit X', ''],
      engagement: null,
    });
    expect(planned.find((i) => i.text === 'planned')).toMatchObject({ at: '2026-03-10T00:00:00.000Z', permalink: '', platforms: [] });
    expect(planned).toHaveLength(2);

    expect(synced).toEqual([
      expect.objectContaining({ text: 'organic', at: '2026-03-20T00:00:00.000Z', permalink: 'https://x.com/9', account_names: ['Duncit X'], engagement: 12, status: 'PUBLISHED' }),
      expect.objectContaining({ text: '', media_url: '', permalink: '', account_names: [''], engagement: 0 }),
    ]);
  });
});
