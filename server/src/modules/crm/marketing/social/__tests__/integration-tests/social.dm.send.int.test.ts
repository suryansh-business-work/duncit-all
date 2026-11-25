/**
 * Direct messages leaving and arriving, against a real database: sending from
 * the Inbox inside Meta's window (a plain response, the human-agent tag, every
 * refusal checked on the server, a failure mapped and kept), the webhook
 * route (verification, signature, async processing), the processor (DMs,
 * comments, profiles, leads), the backfill/fallback sync and the Page's
 * webhook subscription. Meta itself is faked at the messaging provider.
 */
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.credentials'),
  socialCredentials: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/providers/meta.messaging', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/providers/meta.messaging'),
  sendPageMessage: jest.fn(),
  participantProfile: jest.fn(),
  recentConversations: jest.fn(),
  subscribePageWebhooks: jest.fn(),
}));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
// The AI read of new comments is its own suite; here it must not call out.
jest.mock('@modules/crm/marketing/social/social.ai', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.ai'),
  analyzePendingComments: jest.fn(async () => ({})),
}));

import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { IgLeadModel } from '../../../igLeads/igLead.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { SocialApiError } from '../../providers/http';
import { participantProfile, recentConversations, sendPageMessage, subscribePageWebhooks } from '../../providers/meta.messaging';
import { SocialConversationModel, SocialMessageModel } from '../../social.conversation.model';
import { socialCredentials } from '../../social.credentials';
import { recordDm } from '../../social.dm.ingest';
import { sendDirectMessage } from '../../social.dm.send';
import { subscribeConnectedPages, syncConversations } from '../../social.dm.sync';
import { socialInboxResolvers } from '../../social.inbox.resolver';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from '../../social.model';
import { buildSocialOAuthRouter } from '../../social.router';
import { resetSocialSettingsCache } from '../../social.settings';
import { processMetaWebhook } from '../../social.webhook.process';

const m = (fn: unknown) => fn as jest.Mock;
const CREDS = { clientId: 'app-1', clientSecret: 'app-secret', redirectUri: 'https://api/cb', version: 'v23.0', configId: '' };
const HOUR = 3_600_000;
const USER = { id: new Types.ObjectId().toHexString(), email: 'dee@duncit.com' };

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

/** A conversation whose person last wrote `ago` ms back (null: never wrote). */
async function conversationOn(accountId: string, ago: number | null, over: Record<string, unknown> = {}) {
  const doc = await SocialConversationModel.create({
    account_id: accountId,
    platform: 'INSTAGRAM',
    participant: { external_id: 'igsid-1', username: 'asha.k' },
    last_inbound_at: ago === null ? null : new Date(Date.now() - ago),
    unread_count: 2,
    ...over,
  });
  return String(doc._id);
}

const refusal = (code: string) => expect.objectContaining({ extensions: expect.objectContaining({ code }) });

beforeEach(() => {
  resetSocialSettingsCache();
  for (const fn of [sendPageMessage, participantProfile, recentConversations, subscribePageWebhooks, socialCredentials, getRuntimeEnvValue]) m(fn).mockReset();
  m(socialCredentials).mockResolvedValue(CREDS);
  m(getRuntimeEnvValue).mockResolvedValue('');
});

describe('sendDirectMessage', () => {
  it('sends a plain response inside 24 hours, keeps it under Meta’s id, and marks the conversation answered', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), HOUR);
    m(sendPageMessage).mockResolvedValue({ external_id: 'mid.out-1', recipient_id: 'igsid-1' });

    await sendDirectMessage(id, '  Thanks for writing!  ', { user: USER });

    const [handle, recipient, message] = m(sendPageMessage).mock.calls[0];
    expect(handle).toMatchObject({ access_token: 'plain-token', meta: { page_id: 'page-1' } });
    expect(recipient).toEqual({ id: 'igsid-1' });
    expect(message).toEqual({ text: 'Thanks for writing!', messaging_type: 'RESPONSE', tag: '' });
    const out = await SocialMessageModel.findOne({ conversation_id: id }).lean();
    expect(out).toMatchObject({ external_id: 'mid.out-1', direction: 'OUT', status: 'SENT', text: 'Thanks for writing!', sent_by_user_id: USER.id, tag: '' });
    expect(await SocialConversationModel.findById(id).lean()).toMatchObject({ status: 'REPLIED', unread_count: 0, reply_lock_at: null });
    expect(await MarketingRunModel.countDocuments({ workflow: 'INBOX_REPLY' })).toBe(1);
    // The webhook's echo of the same send is the same message.
    expect((await recordDm({ account_id: String(a._id), platform: 'INSTAGRAM', participant_id: 'igsid-1', direction: 'OUT', external_id: 'mid.out-1', text: 'Thanks for writing!', sent_at: new Date() })).duplicate).toBe(true);
  });

  it('lets a person reply on the HUMAN_AGENT tag between 24 hours and 7 days', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), 3 * 24 * HOUR);
    m(sendPageMessage).mockResolvedValue({ external_id: 'mid.out-2', recipient_id: 'igsid-1' });
    await sendDirectMessage(id, 'Sorry for the wait', { user: USER });
    expect(m(sendPageMessage).mock.calls[0][2]).toEqual({ text: 'Sorry for the wait', messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' });
    expect((await SocialMessageModel.findOne({ conversation_id: id }).lean())?.tag).toBe('HUMAN_AGENT');
  });

  it('refuses before anything is sent: closed window, automation past 24 h or to an opted-out person, no permission, no Page, expired, bad text, unknown', async () => {
    const a = await account();
    const accountId = String(a._id);
    await expect(sendDirectMessage(await conversationOn(accountId, null), 'Hi', { user: USER })).rejects.toEqual(refusal('WINDOW_CLOSED'));
    await SocialConversationModel.deleteMany({});
    await expect(sendDirectMessage(await conversationOn(accountId, 8 * 24 * HOUR), 'Hi', { user: USER })).rejects.toEqual(refusal('WINDOW_CLOSED'));
    await SocialConversationModel.deleteMany({});
    await expect(sendDirectMessage(await conversationOn(accountId, 2 * 24 * HOUR), 'Hi', { automation_rule_id: 'r1' })).rejects.toEqual(refusal('WINDOW_CLOSED'));
    await SocialConversationModel.deleteMany({});
    await expect(sendDirectMessage(await conversationOn(accountId, HOUR, { opted_out: true }), 'Hi', { automation_rule_id: 'r1' })).rejects.toEqual(refusal('OPTED_OUT'));
    await SocialConversationModel.deleteMany({});

    const id = await conversationOn(accountId, HOUR);
    await expect(sendDirectMessage(id, '   ', { user: USER })).rejects.toEqual(refusal('BAD_USER_INPUT'));
    await expect(sendDirectMessage(id, 'x'.repeat(1001), { user: USER })).rejects.toThrow('at most 1000 characters');
    await SocialAccountModel.updateOne({ _id: a._id }, { $set: { scopes: ['instagram_basic'] } });
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toThrow('instagram_manage_messages');
    await SocialAccountModel.updateOne({ _id: a._id }, { $set: { scopes: ['instagram_manage_messages'], meta: { login: 'FACEBOOK', page_id: '' } } });
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toThrow('linked to a Facebook Page');
    await SocialAccountModel.updateOne({ _id: a._id }, { $set: { meta: { login: 'FACEBOOK', page_id: 'page-1' }, status: 'EXPIRED' } });
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toThrow('needs reconnecting');
    await SocialAccountModel.updateOne({ _id: a._id }, { $set: { status: 'CONNECTED' } });
    m(socialCredentials).mockResolvedValue(null);
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toEqual(refusal('NOT_CONFIGURED'));
    await expect(sendDirectMessage('nope', 'Hi', { user: USER })).rejects.toEqual(refusal('NOT_FOUND'));
    expect(sendPageMessage).not.toHaveBeenCalled();
    expect(await SocialMessageModel.countDocuments()).toBe(0);
  });

  it('refuses a second send while one is in flight', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), HOUR, { reply_lock_at: new Date() });
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toEqual(refusal('CONFLICT'));
    expect(sendPageMessage).not.toHaveBeenCalled();
  });

  it('keeps a refused send in the thread with Meta’s reason in plain words, and marks the account on a dead token', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), HOUR);
    m(sendPageMessage).mockRejectedValue(new SocialApiError('Facebook', 400, 'Error validating access token', true, { code: 190 }));
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toMatchObject({
      extensions: { code: 'SEND_FAILED' },
      message: 'The message was not sent — The account’s connection has expired. Reconnect it in Social Accounts.',
    });
    expect(await SocialMessageModel.findOne({ conversation_id: id }).lean()).toMatchObject({ status: 'FAILED', external_id: '', error: expect.stringContaining('Reconnect') });
    expect((await SocialAccountModel.findById(a._id).lean())?.status).toBe('EXPIRED');
    expect((await SocialConversationModel.findById(id).lean())?.reply_lock_at).toBeNull();
  });

  it('leaves the account connected when Meta only says the window closed', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), HOUR);
    m(sendPageMessage).mockRejectedValue(new SocialApiError('Facebook', 400, 'outside window', false, { code: 10, subcode: 2018278 }));
    await expect(sendDirectMessage(id, 'Hi', { user: USER })).rejects.toThrow('messaging window has closed');
    expect((await SocialAccountModel.findById(a._id).lean())?.status).toBe('CONNECTED');
  });

  it('is reached through the resolver, which hands the thread back', async () => {
    const a = await account();
    const id = await conversationOn(String(a._id), HOUR);
    m(sendPageMessage).mockResolvedValue({ external_id: 'mid.r', recipient_id: 'igsid-1' });
    const thread = await socialInboxResolvers.Mutation.sendSocialMessage(undefined, { id, text: 'Hello' }, makeContext({ roles: ['MARKETING_EDITOR'] }));
    expect(thread.messages.map((msg) => msg.text)).toEqual(['Hello']);
    await expect(socialInboxResolvers.Mutation.sendSocialMessage(undefined, { id, text: 'x' }, makeContext({ roles: ['CLUB_ADMIN'] }))).rejects.toBeDefined();
  });
});

describe('processMetaWebhook', () => {
  it('stores an inbound DM, names the person from their profile and links them to a waiting lead', async () => {
    const a = await account();
    await IgLeadModel.create({ username: 'asha.k', status: 'CONTACTED' });
    m(participantProfile).mockResolvedValue({ username: 'asha.k', name: 'Asha', avatar_url: 'https://cdn/a.jpg' });
    const payload = {
      object: 'instagram',
      entry: [{ id: a.external_id, messaging: [{ sender: { id: 'igsid-9' }, recipient: { id: a.external_id }, timestamp: Date.now(), message: { mid: 'w-1', text: 'Price?' } }] }],
    };
    expect(await processMetaWebhook(payload)).toEqual({ dms: 1, comments: 0 });
    const stored = await SocialConversationModel.findOne({ 'participant.external_id': 'igsid-9' }).lean();
    expect(stored?.participant).toMatchObject({ username: 'asha.k', name: 'Asha', avatar_url: 'https://cdn/a.jpg' });
    expect((await IgLeadModel.findOne({ username: 'asha.k' }).lean())?.status).toBe('REPLIED');
    // Meta retries a delivery: the same message is not stored or counted twice.
    expect(await processMetaWebhook(payload)).toEqual({ dms: 0, comments: 0 });
    expect(participantProfile).toHaveBeenCalledTimes(1);
  });

  it('still stores the DM when the profile cannot be read, and ignores an account that is not connected', async () => {
    const a = await account();
    m(participantProfile).mockRejectedValue(new Error('no profile access'));
    const message = (accountId: string, mid: string) => ({ sender: { id: 'igsid-3' }, recipient: { id: accountId }, timestamp: Date.now(), message: { mid, text: 'Hi' } });
    const result = await processMetaWebhook({
      object: 'instagram',
      entry: [
        { id: a.external_id, messaging: [message(a.external_id, 'w-2')] },
        { id: 'not-ours', messaging: [message('not-ours', 'w-3')] },
      ],
    });
    expect(result).toEqual({ dms: 1, comments: 0 });
    expect(await SocialMessageModel.countDocuments()).toBe(1);
  });

  it('stores a comment the sync has not seen yet under a stub post, once', async () => {
    const a = await account();
    const payload = {
      object: 'instagram',
      entry: [{ id: a.external_id, time: 1_764_000_000, changes: [{ field: 'comments', value: { id: 'wc-1', text: 'So good', from: { id: 'u-1', username: 'ravi' }, media: { id: 'media-7' } } }] }],
    };
    expect(await processMetaWebhook(payload)).toEqual({ dms: 0, comments: 1 });
    expect(await processMetaWebhook(payload)).toEqual({ dms: 0, comments: 0 });
    const post = await SocialPostModel.findOne({ external_id: 'media-7' }).lean();
    expect(await SocialCommentModel.findOne({ external_id: 'wc-1' }).lean()).toMatchObject({ post_id: String(post?._id), author_handle: 'ravi', status: 'OPEN', ai_status: 'PENDING' });
  });
});

describe('the webhook route', () => {
  const app = express().use('/social', buildSocialOAuthRouter());
  const sign = (body: string, secret = 'app-secret') => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('echoes the challenge only for one of our verify tokens', async () => {
    m(getRuntimeEnvValue).mockImplementation(async (key: string) => (key === 'SOCIAL_FACEBOOK_WEBHOOK_VERIFY_TOKEN' ? 'verify-me' : ''));
    const ok = await request(app).get('/social/webhooks/meta').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '12345' });
    expect(ok.status).toBe(200);
    expect(ok.text).toBe('12345');
    expect((await request(app).get('/social/webhooks/meta').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'guess', 'hub.challenge': '1' })).status).toBe(403);
    expect((await request(app).get('/social/webhooks/meta').query({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'verify-me' })).status).toBe(403);
    m(getRuntimeEnvValue).mockResolvedValue('');
    expect((await request(app).get('/social/webhooks/meta').query({ 'hub.mode': 'subscribe', 'hub.verify_token': '' })).status).toBe(403);
  });

  it('refuses an unsigned or wrongly signed delivery, and a signed one that is not JSON', async () => {
    const body = JSON.stringify({ object: 'instagram', entry: [] });
    expect((await request(app).post('/social/webhooks/meta').set('content-type', 'application/json').send(body)).status).toBe(401);
    expect((await request(app).post('/social/webhooks/meta').set('content-type', 'application/json').set('x-hub-signature-256', sign(body, 'other')).send(body)).status).toBe(401);
    expect((await request(app).post('/social/webhooks/meta').set('content-type', 'application/json').set('x-hub-signature-256', sign('{oops')).send('{oops')).status).toBe(400);
  });

  it('answers a signed delivery at once and stores what it carried just after', async () => {
    const a = await account();
    m(participantProfile).mockResolvedValue({ username: '', name: '', avatar_url: '' });
    const body = JSON.stringify({
      object: 'instagram',
      entry: [{ id: a.external_id, messaging: [{ sender: { id: 'igsid-5' }, recipient: { id: a.external_id }, timestamp: Date.now(), message: { mid: 'route-1', text: 'Hey' } }] }],
    });
    const res = await request(app).post('/social/webhooks/meta').set('content-type', 'application/json').set('x-hub-signature-256', sign(body)).send(body);
    expect(res.status).toBe(200);
    for (let i = 0; i < 100 && (await SocialMessageModel.countDocuments({ external_id: 'route-1' })) === 0; i += 1) await new Promise((r) => setTimeout(r, 20));
    expect(await SocialMessageModel.countDocuments({ external_id: 'route-1' })).toBe(1);
  });
});

describe('syncConversations', () => {
  it('backfills Settings’ days on the first pass, stores each message once, names the person and moves the cursor', async () => {
    const a = await account();
    const conversation = {
      external_thread_id: 't-1',
      participant: { id: 'igsid-7', username: 'meera', name: 'Meera' },
      messages: [
        { external_id: 'b-2', from_id: a.external_id, text: 'Welcome', attachments: [], sent_at: new Date(Date.now() - HOUR) },
        { external_id: 'b-1', from_id: 'igsid-7', text: 'Hi', attachments: [], sent_at: new Date(Date.now() - 2 * HOUR) },
      ],
    };
    m(recentConversations).mockResolvedValue([conversation]);
    const handle = { provider: 'INSTAGRAM' as const, platform: 'INSTAGRAM' as const, external_id: a.external_id, handle: '', access_token: 't', refresh_token: '', meta: {} };

    const syncable = { _id: a._id, platform: 'INSTAGRAM' as const, scopes: ['instagram_manage_messages'], dm_synced_at: null };
    expect(await syncConversations(syncable, handle, CREDS)).toBe(2);
    const since: Date = m(recentConversations).mock.calls[0][1];
    expect(Math.round((Date.now() - since.getTime()) / 86_400_000)).toBe(30);
    const stored = await SocialConversationModel.findOne({ 'participant.external_id': 'igsid-7' }).lean();
    expect(stored).toMatchObject({ external_thread_id: 't-1', last_message_text: 'Welcome', participant: { username: 'meera', name: 'Meera' } });
    const cursor = (await SocialAccountModel.findById(a._id).lean())?.dm_synced_at;
    expect(cursor).toBeInstanceOf(Date);

    expect(await syncConversations({ ...syncable, dm_synced_at: cursor ?? null }, handle, CREDS)).toBe(0);
    expect(m(recentConversations).mock.calls[1][1]).toEqual(cursor);
  });

  it('reads nothing for an account without the messaging permission', async () => {
    const a = await account({ scopes: ['instagram_basic'] });
    const handle = { provider: 'INSTAGRAM' as const, platform: 'INSTAGRAM' as const, external_id: a.external_id, handle: '', access_token: 't', refresh_token: '', meta: {} };
    expect(await syncConversations({ _id: a._id, platform: 'INSTAGRAM', scopes: ['instagram_basic'] }, handle, CREDS)).toBe(0);
    expect(recentConversations).not.toHaveBeenCalled();
  });
});

describe('subscribeConnectedPages', () => {
  it('subscribes each Facebook Login Page and keeps Meta’s refusal on the account', async () => {
    await account({ platform: 'FACEBOOK', provider: 'FACEBOOK', external_id: 'page-ok' });
    await account({ platform: 'FACEBOOK', provider: 'FACEBOOK', external_id: 'page-bad', webhook_error: '' });
    m(subscribePageWebhooks).mockImplementation(async (pageId: string) => {
      if (pageId === 'page-bad') throw new SocialApiError('Facebook', 403, '(#200) requires pages_manage_metadata', false, { code: 200 });
    });
    const page = (id: string, meta: Record<string, string>) => ({
      platform: 'FACEBOOK' as const,
      external_id: id,
      name: id,
      handle: '',
      avatar_url: '',
      profile_url: '',
      followers: 0,
      tokens: { access_token: `${id}-token`, refresh_token: '', expires_at: null, scopes: [] },
      meta,
    });
    await subscribeConnectedPages([page('page-ok', { login: 'FACEBOOK' }), page('page-bad', { login: 'FACEBOOK' }), page('page-old', {})], CREDS);
    expect(m(subscribePageWebhooks).mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ['page-ok', 'page-ok-token'],
      ['page-bad', 'page-bad-token'],
    ]);
    expect((await SocialAccountModel.findOne({ external_id: 'page-ok' }).lean())?.webhook_error).toBe('');
    expect((await SocialAccountModel.findOne({ external_id: 'page-bad' }).lean())?.webhook_error).toContain('pages_manage_metadata');
  });
});
