/**
 * Meta's webhook as jobs, against a real database: each signed delivery kept
 * before the 200, run once (claimed), counted (stored, duplicates, echoes,
 * unknown accounts), retried by the sweep, and listed for managers only. Then
 * the Meta app's own webhook registration read and written, the Page
 * subscription kept on the Page and its Instagram account, and the human
 * agent setting kept when an older client leaves it out. Meta is faked at
 * the providers; there is no queue Redis, so deliveries run in-process.
 */
jest.mock('@modules/crm/marketing/social/social.credentials', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.credentials'),
  socialCredentials: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/providers/meta.messaging', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/providers/meta.messaging'),
  participantProfile: jest.fn(),
  subscribePageWebhooks: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/providers/meta.webhooks', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/providers/meta.webhooks'),
  appSubscriptions: jest.fn(),
  registerAppSubscription: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn(async () => ({ serverUrl: 'https://server.duncit.test/', marketingUrl: 'https://m.test' })) }));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn(async () => '') }));
jest.mock('@modules/crm/marketing/social/social.ai', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.ai'),
  analyzePendingComments: jest.fn(async () => ({})),
}));

import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { SocialApiError } from '../../providers/http';
import { PAGE_WEBHOOK_FIELDS, participantProfile, subscribePageWebhooks } from '../../providers/meta.messaging';
import { appSubscriptions, registerAppSubscription } from '../../providers/meta.webhooks';
import { SocialMessageModel } from '../../social.conversation.model';
import { socialCredentials } from '../../social.credentials';
import { subscribeConnectedPages } from '../../social.dm.sync';
import { socialInboxResolvers } from '../../social.inbox.resolver';
import { SocialAccountModel } from '../../social.model';
import { buildSocialOAuthRouter } from '../../social.router';
import { loadSocialSettings, resetSocialSettingsCache, saveSocialSettings, SOCIAL_SETTINGS_DEFAULTS } from '../../social.settings';
import { SocialWebhookDeliveryModel } from '../../social.webhook.delivery.model';
import { MAX_ATTEMPTS, processDelivery, retryPendingDeliveries, summarizeDelivery } from '../../social.webhook.queue';

const m = (fn: unknown) => fn as jest.Mock;
const CREDS = { clientId: 'app-1', clientSecret: 'app-secret', redirectUri: 'https://api/cb', version: 'v23.0', configId: '' };
const MANAGER = makeContext({ roles: ['MARKETING_MANAGER'] });
const EDITOR = makeContext({ roles: ['MARKETING_EDITOR'] });
const Q = socialInboxResolvers.Query;
const M = socialInboxResolvers.Mutation;

const igAccount = (externalId: string) =>
  SocialAccountModel.create({
    provider: 'INSTAGRAM',
    platform: 'INSTAGRAM',
    external_id: externalId,
    name: 'Duncit IG',
    access_token: 'plain-token',
    scopes: ['instagram_basic', 'instagram_manage_messages'],
    meta: { login: 'FACEBOOK', page_id: 'page-1' },
  });

const dmPayload = (accountId: string, mid: string, echo = false) => ({
  object: 'instagram',
  entry: [
    {
      id: accountId,
      messaging: [
        echo
          ? { sender: { id: accountId }, recipient: { id: 'igsid-1' }, timestamp: Date.now(), message: { mid, text: 'Our reply', is_echo: true } }
          : { sender: { id: 'igsid-1' }, recipient: { id: accountId }, timestamp: Date.now(), message: { mid, text: 'Hi Duncit' } },
      ],
    },
  ],
});

const stored = (payload: unknown, over: Record<string, unknown> = {}) =>
  SocialWebhookDeliveryModel.create({ ...summarizeDelivery(payload), body: JSON.stringify(payload), ...over });

async function settled(id: unknown) {
  for (let i = 0; i < 100; i += 1) {
    const doc = await SocialWebhookDeliveryModel.findById(id).lean();
    if (doc && doc.status !== 'RECEIVED' && doc.status !== 'PROCESSING') return doc;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('the delivery never finished');
}

beforeEach(() => {
  resetSocialSettingsCache();
  for (const fn of [socialCredentials, participantProfile, subscribePageWebhooks, appSubscriptions, registerAppSubscription]) m(fn).mockReset();
  m(socialCredentials).mockResolvedValue(CREDS);
  m(participantProfile).mockResolvedValue({ username: '', name: '', avatar_url: '' });
});

describe('summarizeDelivery', () => {
  it('names the object, the accounts and the fields, once each, and nothing for a payload that is not an object', () => {
    expect(
      summarizeDelivery({
        object: 'page',
        entry: [
          { id: 'p-1', messaging: [{}], changes: [{ field: 'feed' }, { field: 'feed' }] },
          { id: 42, messaging: [] },
          { changes: [{ field: 7 }] },
        ],
      })
    ).toEqual({ object: 'page', entry_ids: ['p-1', '42'], fields: ['messaging', 'feed'] });
    expect(summarizeDelivery('nope')).toEqual({ object: '', entry_ids: [], fields: [] });
  });
});

describe('processDelivery', () => {
  it('stores a DM once: a re-delivery of the same mid is a duplicate, never a second row', async () => {
    const a = await igAccount('ig-100');
    const first = await stored(dmPayload(a.external_id, 'mid-1'));
    await processDelivery(String(first._id));
    expect(await SocialWebhookDeliveryModel.findById(first._id).lean()).toMatchObject({
      status: 'PROCESSED',
      attempts: 1,
      outcome: { events: 1, stored: 1, duplicates: 0, echoes: 0, unknown_account: 0, failed: 0 },
    });
    const again = await stored(dmPayload(a.external_id, 'mid-1'));
    await processDelivery(String(again._id));
    expect((await SocialWebhookDeliveryModel.findById(again._id).lean())?.outcome).toMatchObject({ stored: 0, duplicates: 1 });
    expect(await SocialMessageModel.countDocuments({ external_id: 'mid-1' })).toBe(1);
  });

  it('keeps our own echoed send as outbound, and counts events for accounts nobody connected', async () => {
    const a = await igAccount('ig-101');
    const echo = await stored(dmPayload(a.external_id, 'mid-echo', true));
    await processDelivery(String(echo._id));
    expect((await SocialWebhookDeliveryModel.findById(echo._id).lean())?.outcome).toMatchObject({ echoes: 1, stored: 0 });
    expect(await SocialMessageModel.findOne({ external_id: 'mid-echo' }).lean()).toMatchObject({ direction: 'OUT', status: 'SENT' });

    const stranger = await stored(dmPayload('not-connected', 'mid-x'));
    await processDelivery(String(stranger._id));
    expect((await SocialWebhookDeliveryModel.findById(stranger._id).lean())?.outcome).toMatchObject({ unknown_account: 1, stored: 0 });
  });

  it('runs a delivery only once: a second claim finds nothing to do', async () => {
    const a = await igAccount('ig-102');
    const doc = await stored(dmPayload(a.external_id, 'mid-2'));
    await Promise.all([processDelivery(String(doc._id)), processDelivery(String(doc._id))]);
    expect((await SocialWebhookDeliveryModel.findById(doc._id).lean())?.attempts).toBe(1);
    expect(await SocialMessageModel.countDocuments({ external_id: 'mid-2' })).toBe(1);
  });

  it('marks a body it cannot read FAILED with the reason, and gives up after the last attempt', async () => {
    const doc = await SocialWebhookDeliveryModel.create({ object: 'instagram', body: '{broken' });
    await processDelivery(String(doc._id));
    const failed = await SocialWebhookDeliveryModel.findById(doc._id).lean();
    expect(failed).toMatchObject({ status: 'FAILED', attempts: 1 });
    expect(failed?.error).not.toBe('');
    await SocialWebhookDeliveryModel.updateOne({ _id: doc._id }, { $set: { attempts: MAX_ATTEMPTS } });
    await processDelivery(String(doc._id));
    expect((await SocialWebhookDeliveryModel.findById(doc._id).lean())?.attempts).toBe(MAX_ATTEMPTS);
  });
});

describe('retryPendingDeliveries', () => {
  it('runs what was never dispatched, failed under the cap, or was left mid-run — and leaves fresh and exhausted ones', async () => {
    const a = await igAccount('ig-103');
    const now = Date.now();
    const old = new Date(now - 10 * 60_000);
    const orphan = await stored(dmPayload(a.external_id, 'r-1'), { received_at: old });
    const failed = await stored(dmPayload(a.external_id, 'r-2'), { received_at: old, status: 'FAILED', attempts: 2 });
    const abandoned = await stored(dmPayload(a.external_id, 'r-3'), { received_at: old, status: 'PROCESSING', attempts: 1, processing_at: old });
    const fresh = await stored(dmPayload(a.external_id, 'r-4'));
    const exhausted = await stored(dmPayload(a.external_id, 'r-5'), { received_at: old, status: 'FAILED', attempts: MAX_ATTEMPTS });

    expect(await retryPendingDeliveries(now)).toBe(3);
    for (const doc of [orphan, failed, abandoned]) expect((await SocialWebhookDeliveryModel.findById(doc._id).lean())?.status).toBe('PROCESSED');
    expect((await SocialWebhookDeliveryModel.findById(fresh._id).lean())?.status).toBe('RECEIVED');
    expect((await SocialWebhookDeliveryModel.findById(exhausted._id).lean())?.status).toBe('FAILED');
    // A retried delivery still counts what an earlier attempt stored.
    expect((await SocialWebhookDeliveryModel.findById(failed._id).lean())?.outcome).toMatchObject({ events: 1, stored: 1 });
  });
});

describe('the webhook route at /social/webhook', () => {
  const app = express().use('/social', buildSocialOAuthRouter());
  const sign = (body: string) => `sha256=${createHmac('sha256', 'app-secret').update(body).digest('hex')}`;

  beforeEach(async () => {
    await EnvEntryModel.deleteMany({});
    await EnvEntryModel.create({ name: 'Duncit', category: 'SOCIAL_FACEBOOK', is_default: true, config: { app_id: '1', app_secret: 'app-secret', webhook_verify_token: 'verify-me' } });
  });

  it('answers Meta’s verification on the new address too', async () => {
    const res = await request(app).get('/social/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': 'abc' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('abc');
    expect((await request(app).get('/social/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'nope' })).status).toBe(403);
  });

  it('keeps the signed delivery, answers 200, and stores its DM moments later', async () => {
    const a = await igAccount('ig-104');
    const body = JSON.stringify(dmPayload(a.external_id, 'route-new'));
    const res = await request(app).post('/social/webhook').set('content-type', 'application/json').set('x-hub-signature-256', sign(body)).send(body);
    expect(res.status).toBe(200);
    const delivery = await SocialWebhookDeliveryModel.findOne({ entry_ids: a.external_id }).lean();
    expect(delivery).toMatchObject({ object: 'instagram', fields: ['messaging'], body });
    expect(await settled(delivery?._id)).toMatchObject({ status: 'PROCESSED', outcome: { stored: 1 } });
    expect(await SocialMessageModel.countDocuments({ external_id: 'route-new' })).toBe(1);
  });

  it('keeps nothing from an unsigned delivery', async () => {
    const body = JSON.stringify(dmPayload('ig-x', 'unsigned'));
    expect((await request(app).post('/social/webhook').set('content-type', 'application/json').send(body)).status).toBe(401);
    expect(await SocialWebhookDeliveryModel.countDocuments()).toBe(0);
  });
});

describe('socialWebhookDeliveries', () => {
  it('lists the latest deliveries newest first for a manager, capped at 50, and refuses an editor', async () => {
    const now = Date.now();
    await SocialWebhookDeliveryModel.create(
      Array.from({ length: 52 }, (_, i) => ({ object: 'page', body: `{"n":${i}}`, received_at: new Date(now - i * 1000) }))
    );
    const rows = await Q.socialWebhookDeliveries(undefined, { limit: 500 }, MANAGER);
    expect(rows).toHaveLength(50);
    expect(rows[0]).toMatchObject({ object: 'page', body: '{"n":0}', status: 'RECEIVED', attempts: 0, processed_at: null, outcome: { events: 0 } });
    expect(await Q.socialWebhookDeliveries(undefined, { limit: 2 }, MANAGER)).toHaveLength(2);
    await expect(Q.socialWebhookDeliveries(undefined, {}, EDITOR)).rejects.toBeDefined();
  });
});

describe('the Meta app webhook setup', () => {
  beforeEach(async () => {
    await EnvEntryModel.deleteMany({});
  });

  it('shows one row per Meta app, set beside the URL and fields we expect, without any key', async () => {
    // One Meta app holds both the Instagram and Facebook entries; a second app has no verify token.
    const [ig] = await EnvEntryModel.create([
      { name: 'Duncit IG', category: 'SOCIAL_INSTAGRAM', config: { app_id: '2706', app_secret: 's-1', webhook_verify_token: 'tok' } },
      { name: 'Duncit FB', category: 'SOCIAL_FACEBOOK', config: { app_id: '2706', app_secret: 's-1' } },
      { name: 'Brand two', category: 'SOCIAL_FACEBOOK', config: { app_id: '99', app_secret: 's-2' } },
    ]);
    m(appSubscriptions).mockImplementation(async (app: { clientId: string }) => {
      if (app.clientId === '99') throw new SocialApiError('Facebook', 400, '(#100) bad app', false);
      return [{ object: 'page', callback_url: 'https://server.duncit.test/social/webhook/', active: true, fields: ['messages', 'feed'] }];
    });
    const setup = await Q.socialWebhookSetup(undefined, {}, MANAGER);
    expect(setup).toHaveLength(2);
    const duncit = setup.find((app) => app.app_id === '2706');
    expect(duncit).toMatchObject({ entry_id: String(ig._id), secret_set: true, verify_token_set: true, callback_url: 'https://server.duncit.test/social/webhook', error: '' });
    expect(duncit?.objects).toEqual([
      { object: 'instagram', registered: false, active: false, callback_url: '', callback_matches: false, fields: [], missing_fields: ['messages', 'messaging_postbacks', 'message_reactions', 'comments', 'live_comments'] },
      { object: 'page', registered: true, active: true, callback_url: 'https://server.duncit.test/social/webhook/', callback_matches: true, fields: ['messages', 'feed'], missing_fields: ['messaging_postbacks', 'message_reactions'] },
    ]);
    expect(setup.find((app) => app.app_id === '99')).toMatchObject({ verify_token_set: false, error: 'Facebook: (#100) bad app' });
    expect(JSON.stringify(setup)).not.toContain('s-1');
    expect(() => Q.socialWebhookSetup(undefined, {}, EDITOR)).toThrow();
  });

  it('registers both objects with our URL and the entry’s verify token, and keeps it as a run', async () => {
    const entry = await EnvEntryModel.create({ name: 'Duncit', category: 'SOCIAL_FACEBOOK', config: { app_id: '2706', app_secret: 's-1', webhook_verify_token: 'tok' } });
    m(registerAppSubscription).mockResolvedValue(undefined);
    m(appSubscriptions).mockResolvedValue([]);
    const status = await M.registerSocialWebhook(undefined, { entry_id: String(entry._id) }, MANAGER);
    expect(m(registerAppSubscription).mock.calls.map((call) => [call[1], call[2], call[3]])).toEqual([
      ['instagram', 'https://server.duncit.test/social/webhook', 'tok'],
      ['page', 'https://server.duncit.test/social/webhook', 'tok'],
    ]);
    expect(m(registerAppSubscription).mock.calls[0][0]).toEqual({ clientId: '2706', clientSecret: 's-1', version: 'v23.0' });
    expect(status.app_id).toBe('2706');
    expect(await MarketingRunModel.countDocuments({ workflow: 'SOCIAL_HEALTH', status: 'COMPLETED' })).toBe(1);
  });

  it('refuses an unknown entry, one without a verify token, an editor, and passes on Meta’s refusal', async () => {
    const bare = await EnvEntryModel.create({ name: 'Bare', category: 'SOCIAL_FACEBOOK', config: { app_id: '5', app_secret: 's' } });
    const ready = await EnvEntryModel.create({ name: 'Ready', category: 'SOCIAL_INSTAGRAM', config: { app_id: '6', app_secret: 's', webhook_verify_token: 't' } });
    const code = (c: string) => expect.objectContaining({ extensions: expect.objectContaining({ code: c }) });
    await expect(M.registerSocialWebhook(undefined, { entry_id: new Types.ObjectId().toHexString() }, MANAGER)).rejects.toEqual(code('NOT_FOUND'));
    await expect(M.registerSocialWebhook(undefined, { entry_id: String(bare._id) }, MANAGER)).rejects.toThrow('webhook verify token');
    expect(() => M.registerSocialWebhook(undefined, { entry_id: String(ready._id) }, EDITOR)).toThrow();
    m(registerAppSubscription).mockRejectedValue(new SocialApiError('Facebook', 400, '(#2200) Callback verification failed', false));
    await expect(M.registerSocialWebhook(undefined, { entry_id: String(ready._id) }, MANAGER)).rejects.toMatchObject({
      extensions: { code: 'SEND_FAILED' },
      message: expect.stringContaining('Callback verification failed'),
    });
  });
});

describe('subscribeConnectedPages', () => {
  it('keeps when Meta accepted the subscription, and for which fields, on the Page and its Instagram account', async () => {
    await SocialAccountModel.create({ provider: 'FACEBOOK', platform: 'FACEBOOK', external_id: 'page-1', name: 'Page', access_token: 't', webhook_error: 'old refusal' });
    const ig = await igAccount('ig-105');
    m(subscribePageWebhooks).mockResolvedValue(undefined);
    const page = { platform: 'FACEBOOK' as const, external_id: 'page-1', name: 'Page', handle: '', avatar_url: '', profile_url: '', followers: 0, tokens: { access_token: 'pt', refresh_token: '', expires_at: null, scopes: [] }, meta: { login: 'FACEBOOK' } };
    await subscribeConnectedPages([page], CREDS);
    for (const doc of [await SocialAccountModel.findOne({ external_id: 'page-1' }).lean(), await SocialAccountModel.findById(ig._id).lean()]) {
      expect(doc).toMatchObject({ webhook_error: '', webhook_fields: PAGE_WEBHOOK_FIELDS });
      expect(doc?.webhook_subscribed_at).toBeInstanceOf(Date);
    }
  });

  it('shows the Page’s refusal on its Instagram account too, where the missing DMs are noticed', async () => {
    const ig = await igAccount('ig-106');
    m(subscribePageWebhooks).mockRejectedValue(new SocialApiError('Facebook', 403, '(#200) needs pages_messaging', false, { code: 200 }));
    const page = { platform: 'FACEBOOK' as const, external_id: 'page-1', name: 'Page', handle: '', avatar_url: '', profile_url: '', followers: 0, tokens: { access_token: 'pt', refresh_token: '', expires_at: null, scopes: [] }, meta: { login: 'FACEBOOK' } };
    await subscribeConnectedPages([page], CREDS);
    expect((await SocialAccountModel.findById(ig._id).lean())?.webhook_error).toContain('pages_messaging');
  });
});

describe('human_agent_replies', () => {
  it('is off by default, saved when sent, and kept when an older client leaves it out', async () => {
    expect((await loadSocialSettings()).human_agent_replies).toBe(false);
    const older: Record<string, unknown> = { ...SOCIAL_SETTINGS_DEFAULTS };
    delete older.human_agent_replies;
    expect((await saveSocialSettings({ ...older, human_agent_replies: true }, 'u-1')).human_agent_replies).toBe(true);
    expect((await saveSocialSettings(older, 'u-1')).human_agent_replies).toBe(true);
    expect((await saveSocialSettings({ ...older, human_agent_replies: null }, 'u-1')).human_agent_replies).toBe(true);
    expect((await saveSocialSettings({ ...older, human_agent_replies: false }, 'u-1')).human_agent_replies).toBe(false);
  });
});
