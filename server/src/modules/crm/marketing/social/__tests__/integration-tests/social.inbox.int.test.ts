/**
 * Social › Inbox against a real database: the queue and its views and
 * filters, the summary, assigning and closing, the boot move that fills the
 * Inbox fields on older comments, answering on the network (a MarketingRun
 * per reply, refused with NOT_CONFIGURED where the connection cannot reply),
 * and Claude's draft. The network repliers, the app credentials and the AI
 * funnel are faked — nothing leaves the test.
 */
jest.mock('@modules/crm/marketing/social/providers/replies', () => {
  const replier = () => ({ reply: jest.fn() });
  return {
    REPLIERS: { INSTAGRAM: replier(), FACEBOOK: null, THREADS: replier(), YOUTUBE: replier(), LINKEDIN: replier(), X: replier() },
  };
});
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.credentials'),
  socialCredentials: jest.fn(),
}));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));

import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { openaiChat } from '@services/openai/openai.client';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { REPLIERS } from '../../providers/replies';
import { SocialApiError } from '../../providers/http';
import { socialCredentials } from '../../social.credentials';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from '../../social.model';
import { migrateSocialInbox, socialInbox, viewFilter } from '../../social.inbox';
import { parseDraft, suggestReply } from '../../social.inbox.ai';
import { missingReplyPermission, replyCapabilities, replyToComment } from '../../social.replies';
import { socialInboxResolvers } from '../../social.inbox.resolver';
import type { SocialPlatform } from '../../social.types';

const m = (fn: unknown) => fn as jest.Mock;
const CREDS = { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://api/cb', version: '202510' };
const USAGE = { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 };
const replierMock = (platform: SocialPlatform) => m((REPLIERS[platform] as { reply: unknown }).reply);

let seq = 0;
const staff = (first: string) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `${first.toLowerCase()}${seq}@duncit.com` },
    profile: { first_name: first, last_name: 'Staff' },
    metadata: { status: 'ACTIVE', role_keys: ['MARKETING_EDITOR'] },
  });
};

const account = (platform: SocialPlatform, over: Record<string, unknown> = {}) =>
  SocialAccountModel.create({
    provider: platform,
    platform,
    external_id: `${platform}-${new Types.ObjectId().toHexString()}`,
    name: `Duncit ${platform}`,
    access_token: 'plain-token',
    ...over,
  });

const post = (accountId: string, platform: SocialPlatform, over: Record<string, unknown> = {}) =>
  SocialPostModel.create({
    account_id: accountId,
    platform,
    external_id: `urn:li:share:${new Types.ObjectId().toHexString()}`,
    text: 'Sunday pickleball at HSR',
    published_at: new Date('2026-10-01T00:00:00Z'),
    ...over,
  });

const comment = (accountId: string, postId: string, platform: SocialPlatform, over: Record<string, unknown> = {}) =>
  SocialCommentModel.create({
    account_id: accountId,
    post_id: postId,
    platform,
    external_id: `c-${new Types.ObjectId().toHexString()}`,
    author_name: 'Asha',
    text: 'Is this open to beginners?',
    published_at: new Date('2026-10-02T00:00:00Z'),
    ...over,
  });

/** An account, a post on it and one comment under it. */
async function thread(platform: SocialPlatform, accountOver: Record<string, unknown> = {}, commentOver: Record<string, unknown> = {}) {
  const a = await account(platform, accountOver);
  const p = await post(String(a._id), platform);
  const c = await comment(String(a._id), String(p._id), platform, commentOver);
  return { account: a, post: p, comment: c, id: String(c._id) };
}

const stored = (id: string) => SocialCommentModel.findById(id).lean();
const runs = () => MarketingRunModel.find({ workflow: 'INBOX_REPLY' }).sort({ created_at: 1 }).lean();

beforeEach(() => {
  for (const platform of ['INSTAGRAM', 'THREADS', 'YOUTUBE', 'LINKEDIN', 'X'] as const) replierMock(platform).mockReset();
  m(socialCredentials).mockReset().mockResolvedValue(CREDS);
  m(openaiChat).mockReset();
});

describe('the queue', () => {
  it('slices by view: open, flagged, nobody’s, mine, everything', async () => {
    const me = String(new Types.ObjectId());
    expect(viewFilter('OPEN', me)).toEqual({ status: 'OPEN' });
    expect(viewFilter('FLAGGED', me)).toEqual({ status: 'OPEN', ai_status: 'FLAGGED' });
    expect(viewFilter('UNASSIGNED', me)).toEqual({ status: 'OPEN', assigned_user_id: null });
    expect(viewFilter('MINE', me)).toEqual({ status: 'OPEN', assigned_user_id: me });
    expect(viewFilter('ALL', me)).toEqual({});
    expect(viewFilter(null, me)).toEqual({});
  });

  it('lists comments with their account, post, assignee and replies, filtered and searched', async () => {
    const asha = await staff('Asha');
    const me = String(asha._id);
    const { account: a, post: p } = await thread('LINKEDIN', {}, { text: 'Love this', ai_status: 'FLAGGED', assigned_user_id: asha._id });
    const aid = String(a._id);
    await comment(aid, String(p._id), 'LINKEDIN', { text: 'Done one', status: 'DONE', published_at: new Date('2026-10-03T00:00:00Z') });
    await comment(aid, String(p._id), 'LINKEDIN', {
      text: 'Nobody yet',
      author_name: 'Ravi',
      published_at: new Date('2026-10-04T00:00:00Z'),
      replies: [{ at: new Date('2026-10-05T00:00:00Z'), by_user_id: me, by_name: 'Asha Staff', text: 'Hi Ravi', external_id: 'r1', ok: true }],
    });

    const all = await socialInbox.table({}, 'ALL', me);
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.text)).toEqual(['Nobody yet', 'Done one', 'Love this']);
    expect(all.rows[0]).toMatchObject({
      status: 'OPEN',
      assigned_user_id: null,
      assigned_name: null,
      account_name: 'Duncit LINKEDIN',
      post_text: 'Sunday pickleball at HSR',
      replies: [{ at: '2026-10-05T00:00:00.000Z', by_user_id: me, by_name: 'Asha Staff', text: 'Hi Ravi', external_id: 'r1', ok: true, error: '' }],
    });
    expect(all.rows[2]).toMatchObject({ assigned_user_id: me, assigned_name: 'Asha Staff', replies: [] });

    expect((await socialInbox.table({}, 'MINE', me)).rows.map((r) => r.text)).toEqual(['Love this']);
    expect((await socialInbox.table({}, 'UNASSIGNED', me)).rows.map((r) => r.text)).toEqual(['Nobody yet']);
    expect((await socialInbox.table({}, 'FLAGGED', me)).rows.map((r) => r.text)).toEqual(['Love this']);
    expect((await socialInbox.table({ search: 'ravi' }, null, me)).rows.map((r) => r.text)).toEqual(['Nobody yet']);
    const filtered = await socialInbox.table({ filters: [{ field: 'status', op: 'eq', value: 'DONE' }] }, 'ALL', me);
    expect(filtered.rows.map((r) => r.text)).toEqual(['Done one']);
    const byAssignee = await socialInbox.table({ filters: [{ field: 'assigned_user_id', op: 'eq', value: me }] }, 'ALL', me);
    expect(byAssignee.total).toBe(1);
  });

  it('counts what is waiting for the person asking', async () => {
    const asha = await staff('Asha');
    const me = String(asha._id);
    const { account: a, post: p } = await thread('X', {}, { ai_status: 'FLAGGED' });
    const aid = String(a._id);
    await comment(aid, String(p._id), 'X', { assigned_user_id: asha._id });
    await comment(aid, String(p._id), 'X', { assigned_user_id: new Types.ObjectId(), ai_status: 'FLAGGED' });
    await comment(aid, String(p._id), 'X', { status: 'SPAM', ai_status: 'FLAGGED' });
    expect(await socialInbox.summary(me)).toEqual({ open: 3, flagged: 2, unassigned: 1, mine: 1 });
  });
});

describe('assign and status', () => {
  it('hands a comment to a living user and back to nobody, stamping the activity', async () => {
    const ravi = await staff('Ravi');
    const { id } = await thread('X');
    const given = await socialInbox.assign(id, ` ${String(ravi._id)} `, 'actor');
    expect(given).toMatchObject({ id, assigned_user_id: String(ravi._id), assigned_name: 'Ravi Staff' });
    expect(given.last_activity_at).toEqual(expect.stringMatching(/^\d{4}-/));
    expect(await socialInbox.assign(id, null, 'actor')).toMatchObject({ assigned_user_id: null, assigned_name: null });
    expect(await socialInbox.assign(id, '  ', 'actor')).toMatchObject({ assigned_user_id: null });
  });

  it('refuses an assignee who is not a user, and a comment that is not there', async () => {
    const { id } = await thread('X');
    await expect(socialInbox.assign(id, String(new Types.ObjectId()), 'actor')).rejects.toMatchObject({
      message: 'The assignee is not a known user',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(socialInbox.assign(String(new Types.ObjectId()), null, 'actor')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(socialInbox.setStatus('not-an-id', 'DONE', 'actor')).rejects.toMatchObject({ message: 'Comment not found' });
  });

  it('closes a comment as reviewed by the person, and reopens it clearing the reviewer', async () => {
    const actor = String(new Types.ObjectId());
    const { id } = await thread('X');
    expect(await socialInbox.setStatus(id, 'SPAM', actor)).toMatchObject({ status: 'SPAM', review_status: 'REVIEWED' });
    expect(String((await stored(id))?.reviewed_by)).toBe(actor);
    expect(await socialInbox.setStatus(id, 'OPEN', actor)).toMatchObject({ status: 'OPEN', review_status: 'OPEN', reviewed_at: null });
    expect((await stored(id))?.reviewed_by).toBeNull();
  });
});

describe('migrateSocialInbox', () => {
  it('fills the Inbox fields on older comments once, and then finds nothing to do', async () => {
    const published = new Date('2026-09-01T00:00:00Z');
    const base = { account_id: String(new Types.ObjectId()), post_id: String(new Types.ObjectId()), platform: 'X', text: 't', published_at: published, ai_status: 'CLEAN' };
    const { insertedIds } = await SocialCommentModel.collection.insertMany([
      { ...base, external_id: 'old-1', review_status: 'REVIEWED' },
      { ...base, external_id: 'old-2', review_status: 'OPEN' },
    ]);
    await thread('X');

    expect(await migrateSocialInbox()).toBe(2);
    const reviewed = await stored(String(insertedIds[0]));
    expect(reviewed).toMatchObject({ status: 'DONE', assigned_user_id: null, replies: [], last_activity_at: published });
    expect(await stored(String(insertedIds[1]))).toMatchObject({ status: 'OPEN' });
    expect(await migrateSocialInbox()).toBe(0);
  });

  it('reads a comment the move has not reached yet as its review said', async () => {
    const { insertedId } = await SocialCommentModel.collection.insertOne({
      account_id: String(new Types.ObjectId()),
      post_id: String(new Types.ObjectId()),
      platform: 'X',
      external_id: 'old-3',
      text: 't',
      published_at: new Date(),
      ai_status: 'CLEAN',
      review_status: 'REVIEWED',
    });
    expect(await socialInbox.table({}, 'ALL', String(new Types.ObjectId()))).toMatchObject({ rows: [{ status: 'DONE', replies: [] }] });
    await SocialCommentModel.collection.updateOne({ _id: insertedId }, { $set: { review_status: 'OPEN' } });
    expect((await socialInbox.table({}, 'ALL', 'x')).rows[0].status).toBe('OPEN');
  });
});

describe('reply capability', () => {
  it('can reply everywhere but Facebook, naming the permission Facebook would need', () => {
    expect(replyCapabilities()).toEqual([
      { platform: 'INSTAGRAM', can_reply: true, missing_permission: null, max_length: 2200 },
      { platform: 'FACEBOOK', can_reply: false, missing_permission: 'pages_manage_engagement', max_length: 8000 },
      { platform: 'THREADS', can_reply: true, missing_permission: null, max_length: 500 },
      { platform: 'YOUTUBE', can_reply: true, missing_permission: null, max_length: 10_000 },
      { platform: 'LINKEDIN', can_reply: true, missing_permission: null, max_length: 1250 },
      { platform: 'X', can_reply: true, missing_permission: null, max_length: 280 },
    ]);
  });

  it('names what an account is missing: no replier, a Page token on Instagram, or a grant without the scope', () => {
    expect(missingReplyPermission({ platform: 'FACEBOOK', provider: 'FACEBOOK' })).toBe('pages_manage_engagement');
    expect(missingReplyPermission({ platform: 'INSTAGRAM', provider: 'FACEBOOK' })).toBe('instagram_manage_comments');
    expect(missingReplyPermission({ platform: 'INSTAGRAM', provider: 'INSTAGRAM', scopes: ['instagram_business_basic'] })).toBe(
      'instagram_business_manage_comments'
    );
    expect(missingReplyPermission({ platform: 'X', provider: 'X', scopes: ['tweet.read', 'tweet.write'] })).toBeNull();
    expect(missingReplyPermission({ platform: 'YOUTUBE', provider: 'YOUTUBE', scopes: null })).toBeNull();
    expect(missingReplyPermission({ platform: 'THREADS', provider: 'THREADS', scopes: [] })).toBeNull();
  });
});

describe('replyToComment', () => {
  it('answers on the network as the person, keeps the reply, marks the comment replied and records the run', async () => {
    const asha = await staff('Asha');
    const user = { id: String(asha._id), email: 'asha@duncit.com' };
    const t = await thread('LINKEDIN', { scopes: ['r_organization_social', 'w_organization_social'] });
    replierMock('LINKEDIN').mockResolvedValue({ external_id: 'urn:li:comment:reply' });

    const result = await replyToComment(t.id, '  Yes — beginners welcome!  ', user);

    expect(replierMock('LINKEDIN')).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'LINKEDIN', external_id: t.account.external_id, access_token: 'plain-token' }),
      { comment_id: t.comment.external_id, post_id: t.post.external_id },
      'Yes — beginners welcome!',
      CREDS
    );
    expect(socialCredentials).toHaveBeenCalledWith('LINKEDIN');
    expect(result).toMatchObject({ id: t.id, status: 'REPLIED', review_status: 'REVIEWED' });
    expect(result.replies).toEqual([
      expect.objectContaining({ by_user_id: user.id, by_name: 'Asha Staff', text: 'Yes — beginners welcome!', external_id: 'urn:li:comment:reply', ok: true, error: '' }),
    ]);
    expect((await stored(t.id))?.reply_lock_at).toBeNull();

    const [run] = await runs();
    expect(run).toMatchObject({
      workflow: 'INBOX_REPLY',
      name: 'Reply to Asha on LINKEDIN',
      status: 'COMPLETED',
      actor: { kind: 'USER', id: user.id, name: 'Asha Staff' },
      links: { account_id: String(t.account._id), post_id: String(t.post._id) },
    });
    expect(run.steps.map((s) => [s.key, s.status, s.tool, s.output_summary])).toEqual([['reply', 'OK', 'linkedin.reply', 'urn:li:comment:reply']]);
  });

  it('names the author by handle, or as a comment, and posts with an empty post id when the post is gone', async () => {
    const t = await thread('X', {}, { author_name: '', author_handle: 'ravi_k' });
    await SocialPostModel.deleteOne({ _id: t.post._id });
    replierMock('X').mockResolvedValue({ external_id: '19' });
    await replyToComment(t.id, 'Thanks!', { id: String(new Types.ObjectId()) });
    expect(replierMock('X').mock.calls[0][1]).toEqual({ comment_id: t.comment.external_id, post_id: '' });
    const u = await thread('X', { name: '', handle: '' }, { author_name: '', author_handle: '' });
    replierMock('X').mockResolvedValue({ external_id: '20' });
    await replyToComment(u.id, 'Thanks!', { id: String(new Types.ObjectId()) });
    expect((await runs()).map((r) => r.name)).toEqual(['Reply to ravi_k on X', 'Reply to a comment on X']);
    expect((await runs())[1].steps[0].label).toBe(`Reply on X · ${String(u.account._id)}`);
  });

  it('refuses with NOT_CONFIGURED, naming the permission, where the connection cannot reply — before anything is sent', async () => {
    const facebook = await thread('FACEBOOK');
    await expect(replyToComment(facebook.id, 'Hi', { id: 'u' })).rejects.toMatchObject({
      message: 'Replying on FACEBOOK needs the pages_manage_engagement permission, which this connection does not have.',
      extensions: { code: 'NOT_CONFIGURED', missing_permission: 'pages_manage_engagement' },
    });
    const pageToken = await thread('INSTAGRAM', { provider: 'FACEBOOK' });
    await expect(replyToComment(pageToken.id, 'Hi', { id: 'u' })).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED', missing_permission: 'instagram_manage_comments' },
    });
    const oldGrant = await thread('YOUTUBE', { scopes: ['https://www.googleapis.com/auth/youtube.readonly'] });
    await expect(replyToComment(oldGrant.id, 'Hi', { id: 'u' })).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED', missing_permission: 'https://www.googleapis.com/auth/youtube.force-ssl' },
    });
    const noApp = await thread('THREADS');
    m(socialCredentials).mockResolvedValue(null);
    await expect(replyToComment(noApp.id, 'Hi', { id: 'u' })).rejects.toMatchObject({ extensions: { code: 'NOT_CONFIGURED' } });
    expect(replierMock('THREADS')).not.toHaveBeenCalled();
    expect(await runs()).toEqual([]);
  });

  it('refuses an empty or too-long reply, an expired account, and a comment or account that is not there', async () => {
    const t = await thread('X');
    await expect(replyToComment(t.id, '   ', { id: 'u' })).rejects.toMatchObject({ message: 'Write the reply first.', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(replyToComment(t.id, 'x'.repeat(281), { id: 'u' })).rejects.toMatchObject({ message: 'A reply on X is at most 280 characters.' });
    await SocialAccountModel.updateOne({ _id: t.account._id }, { $set: { status: 'EXPIRED' } });
    await expect(replyToComment(t.id, 'Hi', { id: 'u' })).rejects.toMatchObject({ message: expect.stringMatching(/reconnecting/) });
    await SocialAccountModel.deleteOne({ _id: t.account._id });
    await expect(replyToComment(t.id, 'Hi', { id: 'u' })).rejects.toMatchObject({ message: 'Social account not found' });
    await expect(replyToComment('nope', 'Hi', { id: 'u' })).rejects.toMatchObject({ message: 'Comment not found', extensions: { code: 'NOT_FOUND' } });
    expect(replierMock('X')).not.toHaveBeenCalled();
  });

  it('will not send a second reply while one is going out, but a stale lock does not block', async () => {
    const t = await thread('X');
    await SocialCommentModel.updateOne({ _id: t.comment._id }, { $set: { reply_lock_at: new Date() } });
    await expect(replyToComment(t.id, 'Hi', { id: 'u' })).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    expect(replierMock('X')).not.toHaveBeenCalled();
    await SocialCommentModel.updateOne({ _id: t.comment._id }, { $set: { reply_lock_at: new Date(Date.now() - 3 * 60_000) } });
    replierMock('X').mockResolvedValue({ external_id: '7' });
    await expect(replyToComment(t.id, 'Hi', { id: 'u' })).resolves.toMatchObject({ status: 'REPLIED' });
  });

  it('keeps a refused reply on the thread, fails the run, and marks a dead token expired', async () => {
    const t = await thread('INSTAGRAM');
    replierMock('INSTAGRAM').mockRejectedValue(new SocialApiError('Instagram', 401, 'token revoked', true));
    await expect(replyToComment(t.id, 'Hello', { id: 'u' })).rejects.toMatchObject({
      message: 'The reply was not sent — Instagram: token revoked',
      extensions: { code: 'REPLY_FAILED' },
    });
    const after = await stored(t.id);
    expect(after).toMatchObject({ status: 'OPEN', reply_lock_at: null });
    expect(after?.replies).toEqual([expect.objectContaining({ ok: false, error: 'Instagram: token revoked', external_id: '', text: 'Hello' })]);
    expect(await SocialAccountModel.findById(t.account._id).lean()).toMatchObject({ status: 'EXPIRED', last_error: 'Instagram: token revoked' });
    expect((await runs())[0]).toMatchObject({ status: 'FAILED', error: 'Instagram: token revoked' });
  });

  it('leaves the account alone when the refusal is not about the token', async () => {
    const t = await thread('THREADS');
    replierMock('THREADS').mockRejectedValue('network down');
    await expect(replyToComment(t.id, 'Hello', { id: 'u' })).rejects.toMatchObject({ message: 'The reply was not sent — network down' });
    expect(await SocialAccountModel.findById(t.account._id).lean()).toMatchObject({ status: 'CONNECTED' });
  });
});

describe('suggestReply', () => {
  const answer = (content: string, over: Record<string, unknown> = {}) =>
    m(openaiChat).mockResolvedValue({ ok: true, content, model: 'claude-opus-5-5', usage: USAGE, ...over });

  it('drafts a reply with Claude on an INBOX_REPLY run, with its tokens, and sends nothing', async () => {
    const asha = await staff('Asha');
    const t = await thread('INSTAGRAM', {}, { ai_sentiment: 'NEUTRAL' });
    answer(JSON.stringify({ reply: '  Yes! Beginners are welcome.  ' }));

    const draft = await suggestReply(t.id, { id: String(asha._id) });

    expect(draft.text).toBe('Yes! Beginners are welcome.');
    const call = m(openaiChat).mock.calls[0][0];
    expect(call).toMatchObject({ task: 'marketing.inbox_reply', model: 'claude-opus-5-5', json: true, detail: `comment:${t.id}`, user_id: String(asha._id) });
    expect(call.messages[1].content).toContain('NETWORK: INSTAGRAM');
    expect(call.messages[1].content).toContain('COMMENT: Is this open to beginners?');
    expect(call.messages[1].content).toContain('POST: Sunday pickleball at HSR');
    expect(call.messages[1].content).toContain('AI VERDICT: NEUTRAL');
    expect(call.messages[1].content).toContain('CHARACTER LIMIT: 2200');
    const run = await MarketingRunModel.findById(draft.run_id).lean();
    expect(run).toMatchObject({ workflow: 'INBOX_REPLY', status: 'COMPLETED', cost: { tokens_in: 120, tokens_out: 30 } });
    expect(run?.steps.map((s) => [s.key, s.status, s.tool])).toEqual([['draft', 'OK', 'claude.inbox_reply']]);
    expect(replierMock('INSTAGRAM')).not.toHaveBeenCalled();
    expect((await stored(t.id))?.replies).toEqual([]);
  });

  it('cuts a draft to what the network takes, and works for a comment whose post and account are gone', async () => {
    const t = await thread('X', {}, { author_name: '', author_handle: '', text: '' });
    await Promise.all([SocialPostModel.deleteOne({ _id: t.post._id }), SocialAccountModel.deleteOne({ _id: t.account._id })]);
    answer(JSON.stringify({ reply: 'y'.repeat(400) }));
    const draft = await suggestReply(t.id, { id: String(new Types.ObjectId()) });
    expect(draft.text).toHaveLength(280);
    expect(m(openaiChat).mock.calls[0][0].messages[1].content).toContain('ACCOUNT: \nPOST: \nAUTHOR: \nCOMMENT: ');
  });

  it('fails as AI_UNAVAILABLE with the run named when Claude refuses or answers unreadably', async () => {
    const t = await thread('X');
    m(openaiChat).mockResolvedValue({ ok: false, code: 'DISABLED', message: 'This AI feature is switched off' });
    await expect(suggestReply(t.id, { id: 'u' })).rejects.toMatchObject({
      message: 'This AI feature is switched off',
      extensions: { code: 'AI_UNAVAILABLE', run_id: expect.any(String) },
    });
    answer('not json');
    await expect(suggestReply(t.id, { id: 'u' })).rejects.toMatchObject({ message: 'The AI answered in a form that could not be read — try again.' });
    expect((await runs()).map((r) => r.status)).toEqual(['FAILED', 'FAILED']);
  });

  it('refuses a comment that is not there', async () => {
    await expect(suggestReply('nope', { id: 'u' })).rejects.toMatchObject({ message: 'Comment not found', extensions: { code: 'NOT_FOUND' } });
    await expect(suggestReply(String(new Types.ObjectId()), { id: 'u' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it.each([
    ['{"reply": 5}', ''],
    ['"just text"', ''],
    ['null', ''],
    ['{', ''],
    ['{"reply": "  hi  "}', 'hi'],
  ])('reads %s as %j', (content, expected) => {
    expect(parseDraft(content, 10)).toBe(expected);
  });
});

describe('the Inbox gate', () => {
  const Q = socialInboxResolvers.Query;
  const M = socialInboxResolvers.Mutation;
  const answer = (content: string) => m(openaiChat).mockResolvedValue({ ok: true, content, model: 'claude-opus-5-5', usage: USAGE });

  it('lets an editor work the queue as themselves', async () => {
    const ctx = makeContext({ roles: ['MARKETING_EDITOR'] });
    const t = await thread('X', {}, { assigned_user_id: new Types.ObjectId(ctx.user?.id) });
    expect((await Q.socialInboxTable({}, { view: 'MINE' }, ctx)).total).toBe(1);
    expect(await Q.socialInboxSummary({}, {}, ctx)).toMatchObject({ mine: 1 });
    expect(Q.socialReplyCapabilities({}, {}, ctx)).toHaveLength(6);
    expect(await M.setSocialCommentStatus({}, { id: t.id, status: 'DONE' }, ctx)).toMatchObject({ status: 'DONE' });
    expect(await M.assignSocialComment({}, { id: t.id, user_id: null }, ctx)).toMatchObject({ assigned_user_id: null });
    replierMock('X').mockResolvedValue({ external_id: '1' });
    expect(await M.replyToSocialComment({}, { id: t.id, text: 'Hi' }, ctx)).toMatchObject({ status: 'REPLIED' });
    answer(JSON.stringify({ reply: 'Draft' }));
    expect(await M.suggestSocialReply({}, { id: t.id }, ctx)).toMatchObject({ text: 'Draft' });
  });

  it('keeps everyone else out', () => {
    const ctx = makeContext({ roles: ['CLUB_ADMIN'] });
    expect(() => Q.socialInboxTable({}, {}, ctx)).toThrow(/access denied/i);
    expect(() => Q.socialInboxSummary({}, {}, ctx)).toThrow(/access denied/i);
    expect(() => Q.socialReplyCapabilities({}, {}, ctx)).toThrow(/access denied/i);
    expect(() => M.assignSocialComment({}, { id: 'x' }, ctx)).toThrow(/access denied/i);
    expect(() => M.setSocialCommentStatus({}, { id: 'x', status: 'DONE' }, ctx)).toThrow(/access denied/i);
    expect(() => M.suggestSocialReply({}, { id: 'x' }, ctx)).toThrow(/access denied/i);
    expect(() => M.replyToSocialComment({}, { id: 'x', text: 'Hi' }, ctx)).toThrow(/access denied/i);
  });
});
