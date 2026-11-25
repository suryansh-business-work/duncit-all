/**
 * Auto-replies against a real database: the rules (validation, roles, the
 * table), the engine (master switch, opt-out, Meta's window, the daily cap,
 * one reply per inbound event, Approvals or straight out for a trusted rule,
 * a decision carrying it on), comment-to-DM private replies (once per comment,
 * their own window and opt-out), and the webhook firing it all. Meta itself is
 * faked at the messaging provider.
 */
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.credentials'),
  socialCredentials: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/providers/meta.messaging', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/providers/meta.messaging'),
  sendPageMessage: jest.fn(),
  participantProfile: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/social.ai', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.ai'),
  analyzePendingComments: jest.fn(async () => ({})),
}));

import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { decideRun } from '../../../runs/marketingRun.service';
import { SocialApiError } from '../../providers/http';
import { participantProfile, sendPageMessage } from '../../providers/meta.messaging';
import { SocialAutoReplyModel, SocialAutoReplyRuleModel } from '../../social.autoReply.model';
import { autoReplyToComment, autoReplyToDm, onAutoReplyDecision } from '../../social.autoReply';
import { SocialConversationModel } from '../../social.conversation.model';
import { socialCredentials } from '../../social.credentials';
import { socialInboxResolvers } from '../../social.inbox.resolver';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from '../../social.model';
import { sendPrivateReply } from '../../social.privateReply';
import { SocialSettingsModel, resetSocialSettingsCache } from '../../social.settings';
import { processMetaWebhook } from '../../social.webhook.process';

const m = (fn: unknown) => fn as jest.Mock;
const CREDS = { clientId: 'app-1', clientSecret: 'app-secret', redirectUri: 'https://api/cb', version: 'v23.0', configId: '' };
const HOUR = 3_600_000;
const manager = makeContext({ roles: ['MARKETING_MANAGER'] });
const editor = makeContext({ roles: ['MARKETING_EDITOR'] });
const refusal = (code: string) => expect.objectContaining({ extensions: expect.objectContaining({ code }) });

const account = (over: Record<string, unknown> = {}) =>
  SocialAccountModel.create({
    provider: 'INSTAGRAM',
    platform: 'INSTAGRAM',
    external_id: `ig-${new Types.ObjectId().toHexString()}`,
    name: 'Duncit IG',
    access_token: 'plain-token',
    scopes: ['instagram_basic', 'instagram_manage_messages'],
    meta: { login: 'FACEBOOK', page_id: 'page-1' },
    ...over,
  });

async function settings(over: Record<string, unknown> = {}) {
  await SocialSettingsModel.updateOne(
    { key: 'default' },
    { $set: { auto_reply_enabled: true, auto_reply_requires_approval: true, auto_reply_daily_cap: 50, ...over } },
    { upsert: true }
  );
  resetSocialSettingsCache();
}

const ruleInput = (over: Record<string, unknown> = {}) => ({
  name: 'Price',
  kind: 'KEYWORD',
  keywords: ['price'],
  reply_text: 'Passes start at ₹299.',
  account_ids: [],
  trusted: false,
  enabled: true,
  ...over,
});

const createRule = (over: Record<string, unknown> = {}) =>
  SocialAutoReplyRuleModel.create({ ...ruleInput(), keywords: ['PRICE'], ...over });

async function conversationOn(accountId: string, ago: number | null = HOUR, over: Record<string, unknown> = {}) {
  const doc = await SocialConversationModel.create({
    account_id: accountId,
    platform: 'INSTAGRAM',
    participant: { external_id: 'igsid-1', username: 'asha.k' },
    last_inbound_at: ago === null ? null : new Date(Date.now() - ago),
    ...over,
  });
  return String(doc._id);
}

const dm = (accountId: string, conversationId: string, text = 'Price?', over: Record<string, unknown> = {}) => ({
  account_id: accountId,
  conversation_id: conversationId,
  external_id: `mid-${new Types.ObjectId().toHexString()}`,
  text,
  first_message: false,
  ...over,
});

async function commentOn(accountId: string, over: Record<string, unknown> = {}) {
  const post = await SocialPostModel.create({ account_id: accountId, platform: 'INSTAGRAM', external_id: `media-${new Types.ObjectId().toHexString()}`, published_at: new Date() });
  const doc = await SocialCommentModel.create({
    account_id: accountId,
    post_id: String(post._id),
    platform: 'INSTAGRAM',
    external_id: `c-${new Types.ObjectId().toHexString()}`,
    author_handle: 'ravi',
    author_id: 'u-1',
    text: 'Link please',
    published_at: new Date(Date.now() - HOUR),
    ...over,
  });
  return doc;
}

/** decideRun carries the run on in the background: wait for the reply's new status. */
async function settles(replyId: unknown, status: string) {
  for (let tries = 0; tries < 50; tries += 1) {
    const doc = await SocialAutoReplyModel.findById(replyId).lean();
    if (doc?.status === status) return doc;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`the reply never became ${status}`);
}

beforeEach(() => {
  resetSocialSettingsCache();
  for (const fn of [sendPageMessage, participantProfile, socialCredentials]) m(fn).mockReset();
  m(socialCredentials).mockResolvedValue(CREDS);
  m(sendPageMessage).mockResolvedValue({ external_id: 'mid.auto', recipient_id: 'igsid-1' });
  m(participantProfile).mockResolvedValue({ username: 'asha.k', name: 'Asha', avatar_url: '' });
});

describe('auto-reply rules', () => {
  it('lets a manager create, change and delete a rule, and an editor only read', async () => {
    const created = await socialInboxResolvers.Mutation.createSocialAutoReplyRule(undefined, { input: ruleInput({ keywords: [' price? ', 'PRICE', 'menu  card'] }) }, manager);
    expect(created).toMatchObject({ name: 'Price', kind: 'KEYWORD', keywords: ['PRICE', 'MENU CARD'], trusted: false, enabled: true, sent_7d: 0 });
    expect(() => socialInboxResolvers.Mutation.createSocialAutoReplyRule(undefined, { input: ruleInput() }, editor)).toThrow();

    const page = await socialInboxResolvers.Query.socialAutoReplyRulesTable(undefined, { query: null }, editor);
    expect(page).toMatchObject({ total: 1, rows: [expect.objectContaining({ id: created.id })] });

    const updated = await socialInboxResolvers.Mutation.updateSocialAutoReplyRule(undefined, { id: created.id, input: ruleInput({ kind: 'WELCOME', keywords: ['ignored'], name: 'Hello' }) }, manager);
    expect(updated).toMatchObject({ name: 'Hello', kind: 'WELCOME', keywords: [] });

    await expect(socialInboxResolvers.Mutation.deleteSocialAutoReplyRule(undefined, { id: created.id }, manager)).resolves.toBe(true);
    await expect(socialInboxResolvers.Mutation.deleteSocialAutoReplyRule(undefined, { id: created.id }, manager)).rejects.toEqual(refusal('NOT_FOUND'));
    await expect(socialInboxResolvers.Mutation.updateSocialAutoReplyRule(undefined, { id: 'nope', input: ruleInput() }, manager)).rejects.toEqual(refusal('NOT_FOUND'));
  });

  it('refuses a rule without keywords, a stop keyword, an unknown or non-messaging account, and bad fields', async () => {
    const create = (over: Record<string, unknown>) => socialInboxResolvers.Mutation.createSocialAutoReplyRule(undefined, { input: ruleInput(over) }, manager);
    await expect(create({ keywords: ['?!'] })).rejects.toThrow('keywords: add at least one keyword or phrase');
    await expect(create({ kind: 'FAQ', keywords: ['stop', 'price'] })).rejects.toThrow('keywords: STOP is a stop or start keyword in Social Settings');
    await expect(create({ account_ids: ['not-an-id'] })).rejects.toThrow('account_ids: an account is not known');
    const threads = await account({ provider: 'THREADS', platform: 'THREADS' });
    await expect(create({ account_ids: [String(threads._id)] })).rejects.toThrow('auto-replies answer only connected Facebook and Instagram accounts');
    await expect(create({ name: '' })).rejects.toEqual(refusal('BAD_USER_INPUT'));
    await expect(create({ reply_text: 'x'.repeat(1001) })).rejects.toThrow('reply_text');
    const ig = await account();
    await expect(create({ account_ids: [String(ig._id), String(ig._id)] })).resolves.toMatchObject({ account_ids: [String(ig._id)] });
  });

  it('counts the replies a rule sent in the last week', async () => {
    const rule = await createRule();
    const base = { rule_id: String(rule._id), kind: 'KEYWORD', account_id: 'a', text: 't' };
    await SocialAutoReplyModel.create([
      { ...base, trigger_key: 'a:1', status: 'SENT' },
      { ...base, trigger_key: 'a:2', status: 'SENT' },
      { ...base, trigger_key: 'a:3', status: 'FAILED' },
    ]);
    const page = await socialInboxResolvers.Query.socialAutoReplyRulesTable(undefined, { query: null }, manager);
    expect(page.rows[0]).toMatchObject({ sent_7d: 2 });
  });
});

describe('autoReplyToDm', () => {
  it('drafts a matching rule’s reply into Approvals once per message, and sends nothing yet', async () => {
    await settings();
    const a = await account();
    const rule = await createRule({ account_ids: [String(a._id)] });
    const id = await conversationOn(String(a._id));
    const event = dm(String(a._id), id);

    await autoReplyToDm(event);
    await autoReplyToDm(event); // The same message again (a webhook retry).

    const replies = await SocialAutoReplyModel.find({ conversation_id: id }).lean();
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ rule_id: String(rule._id), status: 'AWAITING_APPROVAL', text: 'Passes start at ₹299.' });
    const run = await MarketingRunModel.findById(replies[0].run_id).lean();
    expect(run).toMatchObject({ workflow: 'INBOX_REPLY', status: 'AWAITING_APPROVAL' });
    expect(run?.steps[0]).toMatchObject({ key: 'draft', status: 'WAITING', output_summary: 'Passes start at ₹299.' });
    expect(sendPageMessage).not.toHaveBeenCalled();
  });

  it('sends a trusted rule’s reply at once, as automation (never the human-agent tag)', async () => {
    await settings();
    const a = await account();
    await createRule({ trusted: true });
    const id = await conversationOn(String(a._id));
    await autoReplyToDm(dm(String(a._id), id));
    expect(m(sendPageMessage).mock.calls[0].slice(1, 3)).toEqual([{ id: 'igsid-1' }, { text: 'Passes start at ₹299.', messaging_type: 'RESPONSE', tag: '' }]);
    expect(await SocialAutoReplyModel.findOne({ conversation_id: id }).lean()).toMatchObject({ status: 'SENT', error: '' });
  });

  it('sends at once when Settings does not ask for approval, and keeps Meta’s refusal', async () => {
    await settings({ auto_reply_requires_approval: false });
    const a = await account();
    await createRule();
    const id = await conversationOn(String(a._id));
    m(sendPageMessage).mockRejectedValue(new SocialApiError('Facebook', 400, '(#10) outside of allowed window', false, { code: 10 }));
    await autoReplyToDm(dm(String(a._id), id));
    const reply = await SocialAutoReplyModel.findOne({ conversation_id: id }).lean();
    expect(reply?.status).toBe('FAILED');
    expect(reply?.error).toContain('not sent');
  });

  it('does nothing when switched off, opted out, outside 24 hours, for another account, or for a disabled rule', async () => {
    const a = await account();
    const other = await account();
    await createRule({ account_ids: [String(other._id)] });
    await createRule({ enabled: false });
    const open = await conversationOn(String(a._id));

    await settings({ auto_reply_enabled: false });
    await createRule();
    await autoReplyToDm(dm(String(a._id), open));
    await settings();
    const optedOut = await conversationOn(String(a._id), HOUR, { 'participant.external_id': 'igsid-2', opted_out: true });
    await autoReplyToDm(dm(String(a._id), optedOut));
    const stale = await conversationOn(String(a._id), 30 * HOUR, { 'participant.external_id': 'igsid-3' });
    await autoReplyToDm(dm(String(a._id), stale));
    await autoReplyToDm(dm(String(a._id), new Types.ObjectId().toHexString()));
    await autoReplyToDm(dm(String(a._id), open, 'hello'));

    expect(await SocialAutoReplyModel.countDocuments()).toBe(0);
  });

  it('greets a first message with the welcome rule, and stops at the daily cap', async () => {
    await settings({ auto_reply_daily_cap: 1 });
    const a = await account();
    await createRule({ kind: 'WELCOME', keywords: [], name: 'Hello', reply_text: 'Welcome to Duncit!' });
    const first = await conversationOn(String(a._id));
    const second = await conversationOn(String(a._id), HOUR, { 'participant.external_id': 'igsid-2' });

    await autoReplyToDm(dm(String(a._id), first, 'hey', { first_message: true }));
    await autoReplyToDm(dm(String(a._id), second, 'hey', { first_message: true }));

    expect(await SocialAutoReplyModel.find().lean()).toEqual([expect.objectContaining({ conversation_id: first, text: 'Welcome to Duncit!' })]);
  });
});

describe('a decision on an auto-reply', () => {
  async function waiting() {
    await settings();
    const a = await account();
    await createRule();
    const id = await conversationOn(String(a._id));
    await autoReplyToDm(dm(String(a._id), id));
    const reply = await SocialAutoReplyModel.findOne({ conversation_id: id }).lean();
    if (!reply) throw new Error('no auto-reply was drafted');
    return reply;
  }

  it('sends it under the approval run once approved', async () => {
    const reply = await waiting();
    await decideRun(reply.run_id, 'APPROVED', { id: 'mgr', name: 'Meera' }, '');
    await settles(reply._id, 'SENT');
    expect(sendPageMessage).toHaveBeenCalledTimes(1);
    const child = await MarketingRunModel.findOne({ parent_run_id: reply.run_id }).lean();
    expect(child).toMatchObject({ workflow: 'INBOX_REPLY', status: 'COMPLETED' });
  });

  it('keeps it as rejected when not approved, and is a no-op for a run that is not an auto-reply', async () => {
    const reply = await waiting();
    await decideRun(reply.run_id, 'REJECTED', { id: 'mgr', name: 'Meera' }, 'Too pushy');
    await settles(reply._id, 'REJECTED');
    const run = await MarketingRunModel.findById(reply.run_id).lean();
    if (!run) throw new Error('the approval run is missing');
    await expect(onAutoReplyDecision(run, 'APPROVED')).resolves.toBeUndefined();
    expect(sendPageMessage).not.toHaveBeenCalled();
  });

  it('fails it when auto-replies were switched off before the yes', async () => {
    const reply = await waiting();
    await settings({ auto_reply_enabled: false });
    await decideRun(reply.run_id, 'APPROVED', { id: 'mgr', name: 'Meera' }, '');
    const failed = await settles(reply._id, 'FAILED');
    expect(failed.error).toContain('switched off');
    expect(sendPageMessage).not.toHaveBeenCalled();
  });
});

describe('comment-to-DM and private replies', () => {
  it('answers a comment holding the phrase with one private reply through the comment', async () => {
    await settings();
    const a = await account();
    await createRule({ kind: 'COMMENT_TO_DM', keywords: ['LINK'], trusted: true, reply_text: 'Here it is: duncit.com' });
    const comment = await commentOn(String(a._id));
    const event = { account_id: String(a._id), comment_id: String(comment._id), external_id: comment.external_id, text: comment.text };

    await autoReplyToComment(event);
    await autoReplyToComment(event);

    expect(m(sendPageMessage).mock.calls).toHaveLength(1);
    expect(m(sendPageMessage).mock.calls[0][1]).toEqual({ comment_id: comment.external_id });
    expect((await SocialCommentModel.findById(comment._id).lean())?.private_reply_at).toBeInstanceOf(Date);
    expect(await SocialAutoReplyModel.findOne({ comment_id: String(comment._id) }).lean()).toMatchObject({ status: 'SENT', kind: 'COMMENT_TO_DM' });
  });

  it('does not answer a comment without the phrase, or while switched off', async () => {
    await settings({ auto_reply_enabled: false });
    const a = await account();
    await createRule({ kind: 'COMMENT_TO_DM', keywords: ['LINK'], trusted: true });
    const comment = await commentOn(String(a._id));
    await autoReplyToComment({ account_id: String(a._id), comment_id: String(comment._id), external_id: comment.external_id, text: 'Link?' });
    await settings();
    await autoReplyToComment({ account_id: String(a._id), comment_id: String(comment._id), external_id: comment.external_id, text: 'Lovely' });
    expect(await SocialAutoReplyModel.countDocuments()).toBe(0);
  });

  it('lets a person send one private reply within 7 days, and holds automation to 24 hours and the opt-out', async () => {
    const a = await account();
    const old = await commentOn(String(a._id), { published_at: new Date(Date.now() - 30 * HOUR) });
    await expect(sendPrivateReply(String(old._id), 'Hi', { automation_rule_id: 'r1' })).rejects.toEqual(refusal('WINDOW_CLOSED'));
    await expect(sendPrivateReply(String(old._id), '  Hi there  ', { user: { id: new Types.ObjectId().toHexString() } })).resolves.toEqual({ external_id: 'mid.auto', recipient_id: 'igsid-1' });
    expect(m(sendPageMessage).mock.calls[0][2]).toEqual({ text: 'Hi there', messaging_type: 'RESPONSE', tag: '' });
    await expect(sendPrivateReply(String(old._id), 'Again', {})).rejects.toEqual(refusal('CONFLICT'));

    const week = await commentOn(String(a._id), { published_at: new Date(Date.now() - 8 * 24 * HOUR) });
    await expect(sendPrivateReply(String(week._id), 'Hi', {})).rejects.toEqual(refusal('WINDOW_CLOSED'));

    await conversationOn(String(a._id), HOUR, { 'participant.external_id': 'u-1', opted_out: true });
    const fresh = await commentOn(String(a._id));
    await expect(sendPrivateReply(String(fresh._id), 'Hi', { automation_rule_id: 'r1' })).rejects.toEqual(refusal('OPTED_OUT'));
  });

  it('refuses an unknown comment, Threads, an empty or too long text, and frees the comment when Meta refuses', async () => {
    const a = await account();
    await expect(sendPrivateReply('nope', 'Hi', {})).rejects.toEqual(refusal('NOT_FOUND'));
    const threads = await commentOn(String(a._id), { platform: 'THREADS' });
    await expect(sendPrivateReply(String(threads._id), 'Hi', {})).rejects.toEqual(refusal('BAD_USER_INPUT'));
    const comment = await commentOn(String(a._id), { author_id: '', author_handle: '' });
    await expect(sendPrivateReply(String(comment._id), '   ', {})).rejects.toThrow('Write the message first.');
    await expect(sendPrivateReply(String(comment._id), 'x'.repeat(1001), {})).rejects.toThrow('at most 1000 characters');
    m(sendPageMessage).mockRejectedValue(new SocialApiError('Facebook', 400, '(#10) cannot reply privately', false, { code: 10 }));
    await expect(sendPrivateReply(String(comment._id), 'Hi', { automation_rule_id: 'r1' })).rejects.toEqual(refusal('SEND_FAILED'));
    expect((await SocialCommentModel.findById(comment._id).lean())?.private_reply_at).toBeNull();
  });
});

describe('the webhook fires auto-replies', () => {
  it('answers a new DM and a new comment from Meta’s delivery', async () => {
    await settings();
    const a = await account();
    await createRule({ trusted: true });
    await createRule({ kind: 'COMMENT_TO_DM', keywords: ['LINK'], trusted: true, name: 'Link', reply_text: 'duncit.com' });
    const now = Date.now();
    await processMetaWebhook({
      object: 'instagram',
      entry: [
        {
          id: a.external_id,
          time: Math.floor(now / 1000),
          messaging: [{ sender: { id: 'igsid-7' }, recipient: { id: a.external_id }, timestamp: now, message: { mid: 'hook-1', text: 'PRICE' } }],
          changes: [{ field: 'comments', value: { id: 'hook-c1', text: 'link pls', from: { id: 'u-7', username: 'meera' }, media: { id: 'media-hook' } } }],
        },
      ],
    });
    const replies = await SocialAutoReplyModel.find().sort({ kind: 1 }).lean();
    expect(replies.map((reply) => [reply.kind, reply.status])).toEqual([
      ['COMMENT_TO_DM', 'SENT'],
      ['KEYWORD', 'SENT'],
    ]);
    expect(await SocialCommentModel.findOne({ external_id: 'hook-c1' }).lean()).toMatchObject({ author_id: 'u-7' });
  });
});
