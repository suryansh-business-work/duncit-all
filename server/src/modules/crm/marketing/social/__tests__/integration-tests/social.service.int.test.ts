/**
 * Social Accounts against a real database: connecting (OAuth handshake →
 * stored accounts), syncing, disconnecting, and the posts / comments tables and
 * post detail. The provider APIs, OAuth state signing, the sync, and every AI
 * call are mocked — no network.
 */
jest.mock('@modules/crm/marketing/social/providers', () => {
  const connector = () => ({ authorizeUrl: jest.fn(), connect: jest.fn() });
  return { CONNECTORS: { LINKEDIN: connector(), META: connector(), X: connector(), YOUTUBE: connector() } };
});
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({
  providerReadiness: jest.fn(),
  socialCredentials: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/social.oauth', () => ({
  readConnectState: jest.fn(),
  startConnect: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/social.sync', () => ({ syncSocialAccount: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.ai', () => ({ analyzePendingComments: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.analytics', () => ({
  sentimentCounts: jest.fn(),
  socialAnalytics: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/social.insights', () => ({
  accountAverage: jest.fn(),
  analyzePost: jest.fn(),
  periodInsights: jest.fn(),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { CONNECTORS } from '../../providers';
import { providerReadiness, socialCredentials } from '../../social.credentials';
import { readConnectState, startConnect } from '../../social.oauth';
import { syncSocialAccount } from '../../social.sync';
import { analyzePendingComments } from '../../social.ai';
import { sentimentCounts, socialAnalytics } from '../../social.analytics';
import { accountAverage, analyzePost, periodInsights } from '../../social.insights';
import {
  SocialAccountModel,
  SocialAccountSnapshotModel,
  SocialCommentModel,
  SocialPostModel,
} from '../../social.model';
import { socialService as svc } from '../../social.service';

const m = (fn: unknown) => fn as jest.Mock;
const USER = new Types.ObjectId().toHexString();
const CREDS = { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://api/cb', version: '' };

const account = (platform: string, over: Record<string, unknown> = {}) =>
  SocialAccountModel.create({
    provider: platform === 'FACEBOOK' || platform === 'INSTAGRAM' ? 'META' : platform,
    platform,
    external_id: `${platform}-${new Types.ObjectId().toHexString()}`,
    name: `Duncit ${platform}`,
    ...over,
  });

const socialPost = (accountId: string, over: Record<string, unknown> = {}) =>
  SocialPostModel.create({
    account_id: accountId,
    platform: 'X',
    external_id: `p-${new Types.ObjectId().toHexString()}`,
    published_at: new Date('2026-03-01T00:00:00Z'),
    ...over,
  });

const comment = (accountId: string, postId: string, over: Record<string, unknown> = {}) =>
  SocialCommentModel.create({
    account_id: accountId,
    post_id: postId,
    platform: 'X',
    external_id: `c-${new Types.ObjectId().toHexString()}`,
    published_at: new Date('2026-03-02T00:00:00Z'),
    ...over,
  });

const discovered = (external_id: string, over: Record<string, unknown> = {}) => ({
  platform: 'X',
  external_id,
  name: `Name ${external_id}`,
  handle: `@${external_id}`,
  avatar_url: '',
  profile_url: '',
  followers: 10,
  meta: {},
  tokens: { access_token: `at-${external_id}`, refresh_token: 'rt', expires_at: null, scopes: ['tweet.read'] },
  ...over,
});

beforeEach(() => {
  for (const fn of [socialCredentials, readConnectState, startConnect, syncSocialAccount, sentimentCounts, accountAverage, analyzePost]) {
    m(fn).mockReset();
  }
  for (const c of Object.values(CONNECTORS)) {
    m(c.authorizeUrl).mockReset();
    m(c.connect).mockReset();
  }
  m(syncSocialAccount).mockResolvedValue(undefined);
});

describe('pass-through entry points', () => {
  it('delegates providers, analytics, insights and analyze to their modules', async () => {
    expect(svc.providers).toBe(providerReadiness);
    expect(svc.analytics).toBe(socialAnalytics);
    expect(svc.insights).toBe(periodInsights);
    m(analyzePendingComments).mockResolvedValue({ analyzed: 3 });
    expect(await svc.analyze()).toEqual({ analyzed: 3 });
    expect(analyzePendingComments).toHaveBeenCalledWith();
  });
});

describe('accounts', () => {
  it('lists accounts by platform then name with their open flagged-comment counts', async () => {
    const x = await account('X', { name: 'B', followers: 5, last_synced_at: new Date('2026-03-01T00:00:00Z') });
    const li = await account('LINKEDIN', { name: 'A' });
    const p = await socialPost(String(x._id));
    await comment(String(x._id), String(p._id), { ai_status: 'FLAGGED' });
    await comment(String(x._id), String(p._id), { ai_status: 'FLAGGED' });
    await comment(String(x._id), String(p._id), { ai_status: 'FLAGGED', review_status: 'REVIEWED' });
    await comment(String(x._id), String(p._id), { ai_status: 'CLEAN' });

    const list = await svc.accounts();
    expect(list.map((a) => [a.platform, a.flagged_open])).toEqual([
      ['LINKEDIN', 0],
      ['X', 2],
    ]);
    expect(list[1]).toMatchObject({
      id: String(x._id),
      provider: 'X',
      name: 'B',
      followers: 5,
      status: 'CONNECTED',
      last_error: '',
      last_synced_at: '2026-03-01T00:00:00.000Z',
      token_expires_at: null,
    });
    expect(list[0].id).toBe(String(li._id));
    expect(list[0].created_at).toEqual(expect.stringMatching(/^\d{4}-/));
  });

  it('fills defaults for a legacy row missing optional fields', async () => {
    await SocialAccountModel.collection.insertOne({ provider: 'X', platform: 'X', external_id: 'legacy', status: 'ERROR' });
    const [row] = await svc.accounts();
    expect(row).toMatchObject({ name: '', handle: '', avatar_url: '', profile_url: '', followers: 0, last_error: '', created_at: null });
  });
});

describe('connectUrl', () => {
  it('refuses a network Tech has not configured', async () => {
    m(socialCredentials).mockResolvedValue(null);
    await expect(svc.connectUrl('LINKEDIN', USER, 'ACCOUNTS')).rejects.toMatchObject({
      extensions: { code: 'SOCIAL_APP_NOT_CONFIGURED' },
    });
    expect(startConnect).not.toHaveBeenCalled();
  });

  it('builds the consent url from a fresh signed state', async () => {
    m(socialCredentials).mockResolvedValue(CREDS);
    m(startConnect).mockReturnValue({ state: 'signed', challenge: 'pkce' });
    m(CONNECTORS.YOUTUBE.authorizeUrl).mockReturnValue('https://accounts.google.com/o?x=1');
    expect(await svc.connectUrl('YOUTUBE', USER, 'CALENDAR')).toBe('https://accounts.google.com/o?x=1');
    expect(startConnect).toHaveBeenCalledWith('YOUTUBE', USER, 'CALENDAR');
    expect(CONNECTORS.YOUTUBE.authorizeUrl).toHaveBeenCalledWith({ creds: CREDS, state: 'signed', challenge: 'pkce' });
  });
});

describe('completeConnect', () => {
  const state = { provider: 'X', userId: USER, verifier: 'v', returnTo: 'ACCOUNTS' };

  it('refuses a forged or stale state', async () => {
    m(readConnectState).mockReturnValue(null);
    await expect(svc.completeConnect('code', 'bad')).rejects.toThrow('This connect link has expired or did not start here.');
  });

  it('refuses when the network was unconfigured mid-handshake', async () => {
    m(readConnectState).mockReturnValue(state);
    m(socialCredentials).mockResolvedValue(null);
    await expect(svc.completeConnect('code', 's')).rejects.toThrow('This network is not set up yet');
  });

  it('stores what the handshake found, refreshes a reconnected account in place, and starts the first sync', async () => {
    const existing = await account('X', { external_id: 'x-1', status: 'EXPIRED', last_error: 'token expired' });
    m(readConnectState).mockReturnValue(state);
    m(socialCredentials).mockResolvedValue(CREDS);
    m(CONNECTORS.X.connect).mockResolvedValue([discovered('x-1'), discovered('x-2')]);

    expect(await svc.completeConnect('the-code', 's')).toEqual({ provider: 'X', count: 2 });
    expect(CONNECTORS.X.connect).toHaveBeenCalledWith({ code: 'the-code', creds: CREDS, verifier: 'v' });

    const stored = await SocialAccountModel.find().select('+access_token +refresh_token').sort({ external_id: 1 }).lean();
    expect(stored).toHaveLength(2);
    expect(String(stored[0]._id)).toBe(String(existing._id));
    expect(stored[0]).toMatchObject({
      provider: 'X',
      name: 'Name x-1',
      access_token: 'at-x-1',
      refresh_token: 'rt',
      token_expires_at: null,
      scopes: ['tweet.read'],
      status: 'CONNECTED',
      last_error: '',
    });
    expect(String(stored[1].connected_by)).toBe(USER);
    expect(m(syncSocialAccount).mock.calls.map((c) => c[0]).sort((a, b) => a.localeCompare(b))).toEqual(
      stored.map((s) => String(s._id)).sort((a, b) => a.localeCompare(b))
    );
  });

  it('logs a failed first sync without failing the connect', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    m(readConnectState).mockReturnValue(state);
    m(socialCredentials).mockResolvedValue(CREDS);
    m(CONNECTORS.X.connect).mockResolvedValue([discovered('x-9')]);
    m(syncSocialAccount).mockRejectedValue(new Error('rate limited'));

    expect((await svc.completeConnect('c', 's')).count).toBe(1);
    for (let i = 0; i < 200 && error.mock.calls.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    expect(error).toHaveBeenCalledWith('social-accounts', 'firstSync', {
      error: expect.any(Error),
      account_id: expect.any(String),
      msg: 'first sync failed',
    });
    error.mockRestore();
  });

  it('stores nothing when the handshake found no account', async () => {
    m(readConnectState).mockReturnValue(state);
    m(socialCredentials).mockResolvedValue(CREDS);
    m(CONNECTORS.X.connect).mockResolvedValue([]);
    expect(await svc.completeConnect('c', 's')).toEqual({ provider: 'X', count: 0 });
    expect(syncSocialAccount).not.toHaveBeenCalled();
  });
});

describe('sync / disconnect', () => {
  it('syncs a known account and returns it fresh', async () => {
    const x = await account('X');
    const p = await socialPost(String(x._id));
    await comment(String(x._id), String(p._id), { ai_status: 'FLAGGED' });
    const out = await svc.sync(String(x._id));
    expect(syncSocialAccount).toHaveBeenCalledWith(String(x._id));
    expect(out).toMatchObject({ id: String(x._id), flagged_open: 1 });
  });

  it('refuses to sync an unknown account', async () => {
    await expect(svc.sync(new Types.ObjectId().toHexString())).rejects.toMatchObject({
      message: 'Social account not found',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(syncSocialAccount).not.toHaveBeenCalled();
  });

  it('reports not found when the account vanishes during the sync', async () => {
    const x = await account('X');
    m(syncSocialAccount).mockImplementation(async (id: string) => {
      await SocialAccountModel.deleteOne({ _id: id });
    });
    await expect(svc.sync(String(x._id))).rejects.toThrow('Social account not found');
  });

  it('removes the account with everything read from it, and only that', async () => {
    const x = await account('X');
    const other = await account('LINKEDIN');
    const xId = String(x._id);
    const otherId = String(other._id);
    const p = await socialPost(xId);
    await comment(xId, String(p._id));
    await SocialAccountSnapshotModel.create({ account_id: xId, day: '2026-03-01', followers: 1 });
    const keep = await socialPost(otherId);
    await comment(otherId, String(keep._id));
    await SocialAccountSnapshotModel.create({ account_id: otherId, day: '2026-03-01', followers: 1 });

    expect(await svc.disconnect(xId)).toBe(true);
    expect(await SocialAccountModel.countDocuments()).toBe(1);
    for (const model of [SocialPostModel, SocialCommentModel, SocialAccountSnapshotModel] as const) {
      expect(await (model as typeof SocialPostModel).countDocuments({ account_id: xId })).toBe(0);
      expect(await (model as typeof SocialPostModel).countDocuments({ account_id: otherId })).toBe(1);
    }
    await expect(svc.disconnect(xId)).rejects.toThrow('Social account not found');
  });
});

describe('postsTable / postDetail', () => {
  it('rows carry the account name, engagement rate and AI score', async () => {
    const x = await account('X', { followers: 400 });
    const xId = String(x._id);
    await socialPost(xId, {
      text: 'big',
      engagement: 30,
      likes: 20,
      views: 1000,
      ai_analysis: { score: 8, summary: 'good', strengths: ['hook'], analyzed_at: new Date('2026-03-03T00:00:00Z') },
      published_at: new Date('2026-03-02T00:00:00Z'),
    });
    await socialPost(new Types.ObjectId().toHexString(), { text: 'orphan', engagement: 5 });

    const page = await svc.postsTable({ sort_by: 'published_at', sort_dir: 'desc' });
    expect(page.total).toBe(2);
    expect(page.rows[0]).toMatchObject({
      text: 'big',
      account_name: `Duncit X`,
      engagement_rate: 7.5,
      views: 1000,
      ai_score: 8,
      ai_analysis: { score: 8, summary: 'good', strengths: ['hook'], improvements: [], next_idea: '', analyzed_at: '2026-03-03T00:00:00.000Z' },
    });
    expect(page.rows[1]).toMatchObject({ text: 'orphan', account_name: '', engagement_rate: 0, views: null, ai_score: null, ai_analysis: null });
  });

  it('fills defaults for a sparse legacy post', async () => {
    await SocialPostModel.collection.insertOne({
      account_id: new Types.ObjectId().toHexString(),
      platform: 'X',
      external_id: 'legacy',
      published_at: new Date('2026-03-01T00:00:00Z'),
      ai_analysis: {},
    });
    const [row] = (await svc.postsTable(null)).rows;
    expect(row).toMatchObject({
      text: '',
      media_url: '',
      permalink: '',
      likes: 0,
      comments: 0,
      shares: 0,
      views: null,
      engagement: 0,
      // An (empty) analysis exists, so its defaulted score is reported — null is only for no analysis at all.
      ai_score: 0,
      ai_analysis: { score: 0, summary: '', strengths: [], improvements: [], next_idea: '', analyzed_at: null },
    });
  });

  it.each(['not-an-id', new Types.ObjectId().toHexString()])('reports post %s as not found', async (id) => {
    await expect(svc.postDetail(id)).rejects.toMatchObject({ message: 'Post not found', extensions: { code: 'NOT_FOUND' } });
  });

  it('judges a post against its account average and lists its newest comments', async () => {
    const x = await account('X', { followers: 100 });
    const xId = String(x._id);
    const p = await socialPost(xId, { text: 'the post', permalink: 'https://x.com/p', engagement: 10 });
    const pid = String(p._id);
    for (let i = 0; i < 22; i += 1) {
      await comment(xId, pid, { text: `c${i}`, published_at: new Date(Date.UTC(2026, 2, 1, i)) });
    }
    m(accountAverage).mockResolvedValue({ engagement: 4 });
    m(sentimentCounts).mockResolvedValue({ POSITIVE: 2 });

    const d = await svc.postDetail(pid);
    expect(d.post).toMatchObject({ id: pid, engagement_rate: 10 });
    expect(d.average).toEqual({ engagement: 4 });
    expect(d.sentiment).toEqual({ POSITIVE: 2 });
    expect(sentimentCounts).toHaveBeenCalledWith({ post_id: pid });
    expect(m(accountAverage).mock.calls[0][0].text).toBe('the post');
    expect(d.recent_comments).toHaveLength(20);
    expect(d.recent_comments[0]).toMatchObject({ text: 'c21', post_text: 'the post', post_permalink: 'https://x.com/p', account_name: 'Duncit X' });
    expect(d.recent_comments[19].text).toBe('c2');
  });

  it('asks the AI about the post, then returns the refreshed detail', async () => {
    const x = await account('X');
    const p = await socialPost(String(x._id));
    m(analyzePost).mockImplementation(async (id: string) => {
      await SocialPostModel.updateOne({ _id: id }, { $set: { ai_analysis: { score: 6 } } });
    });
    const d = await svc.analyzePost(String(p._id));
    expect(analyzePost).toHaveBeenCalledWith(String(p._id));
    expect(d.post.ai_score).toBe(6);
  });
});

describe('commentsTable / review', () => {
  it('joins each comment to its account and post, with defaults for what is missing', async () => {
    const x = await account('X');
    const xId = String(x._id);
    const p = await socialPost(xId, { text: 'parent', permalink: 'https://x.com/parent' });
    await comment(xId, String(p._id), {
      text: 'rude',
      author_name: 'Troll',
      ai_status: 'FLAGGED',
      ai_sentiment: 'NEGATIVE',
      ai_severity: 'HIGH',
      ai_categories: ['abuse'],
      ai_analyzed_at: new Date('2026-03-04T00:00:00Z'),
      published_at: new Date('2026-03-05T00:00:00Z'),
    });
    await comment(xId, new Types.ObjectId().toHexString(), { published_at: new Date('2026-03-01T00:00:00Z') });

    const page = await svc.commentsTable({ filters: [] });
    expect(page.total).toBe(2);
    expect(page.rows[0]).toMatchObject({
      text: 'rude',
      author_name: 'Troll',
      account_name: 'Duncit X',
      post_text: 'parent',
      post_permalink: 'https://x.com/parent',
      ai_sentiment: 'NEGATIVE',
      ai_severity: 'HIGH',
      ai_categories: ['abuse'],
      ai_analyzed_at: '2026-03-04T00:00:00.000Z',
      review_status: 'OPEN',
      reviewed_at: null,
    });
    expect(page.rows[1]).toMatchObject({ post_text: '', post_permalink: '', ai_sentiment: null, ai_severity: null, ai_reason: '' });

    const searched = await svc.commentsTable({ search: 'troll' });
    expect(searched.rows.map((r) => r.text)).toEqual(['rude']);
  });

  it('marks a comment reviewed by someone, and reopens it clearing the reviewer', async () => {
    const x = await account('X');
    const p = await socialPost(String(x._id));
    const c = await comment(String(x._id), String(p._id), { ai_status: 'FLAGGED' });

    const reviewed = await svc.review(String(c._id), 'REVIEWED', USER);
    expect(reviewed.review_status).toBe('REVIEWED');
    expect(reviewed.reviewed_at).toEqual(expect.stringMatching(/^\d{4}-/));
    expect(String((await SocialCommentModel.findById(c._id).lean())?.reviewed_by)).toBe(USER);

    const reopened = await svc.review(String(c._id), 'OPEN', USER);
    expect(reopened).toMatchObject({ review_status: 'OPEN', reviewed_at: null });
    expect((await SocialCommentModel.findById(c._id).lean())?.reviewed_by).toBeNull();
  });

  it('refuses to review an unknown comment', async () => {
    await expect(svc.review(new Types.ObjectId().toHexString(), 'REVIEWED', USER)).rejects.toMatchObject({
      message: 'Comment not found',
    });
  });
});
