/**
 * Mail automation's account and rule service against a real database. Google
 * (OAuth + Gmail) and the reply composer's AI are mocked; the account and
 * thread documents and every rule check are real.
 */
jest.mock('@modules/platform/mailAutomation/gmail.oauth', () => ({
  buildConsentUrl: jest.fn(),
  exchangeCode: jest.fn(),
  googleOAuthCredentials: jest.fn(),
  readIdToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  verifyOAuthState: jest.fn(),
}));
jest.mock('@modules/platform/mailAutomation/gmail.api', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/gmail.api'),
  getProfile: jest.fn(),
}));
jest.mock('@modules/platform/mailAutomation/mailAutomation.reply', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/mailAutomation.reply'),
  previewReply: jest.fn(),
}));

import { Types } from 'mongoose';
import * as oauth from '../../gmail.oauth';
import { getProfile } from '../../gmail.api';
import { previewReply } from '../../mailAutomation.reply';
import {
  DEFAULT_REPLY_TEMPLATE,
  MailAutomationAccountModel,
  MailAutomationThreadModel,
} from '../../mailAutomation.model';
import { mailAutomationService as svc } from '../../mailAutomation.service';

const m = (fn: unknown) => fn as jest.Mock;
const USER = new Types.ObjectId().toHexString();
const READ = 'https://www.googleapis.com/auth/gmail.readonly';
const SEND = 'https://www.googleapis.com/auth/gmail.send';
const TEMPLATE = 'Hi {{sender_name}}, your ticket is {{ticket_no}}.';

const mailbox = (over: Record<string, unknown> = {}) =>
  MailAutomationAccountModel.create({ email: 'support@duncit.com', refresh_token: 'rt', ...over });

const setCreatedAt = (model: typeof MailAutomationAccountModel | typeof MailAutomationThreadModel, id: unknown, iso: string) =>
  (model as typeof MailAutomationAccountModel).collection.updateOne({ _id: id as Types.ObjectId }, { $set: { created_at: new Date(iso) } });

beforeEach(() => {
  for (const fn of Object.values(oauth)) if (jest.isMockFunction(fn)) fn.mockReset();
  m(getProfile).mockReset();
  m(previewReply).mockReset();
});

describe('configured / connectUrl', () => {
  it('reports whether a Google OAuth client exists', async () => {
    m(oauth.googleOAuthCredentials).mockResolvedValue({ clientId: 'c' });
    expect(await svc.configured()).toBe(true);
    m(oauth.googleOAuthCredentials).mockResolvedValue(null);
    expect(await svc.configured()).toBe(false);
  });

  it('passes the login hint through, and drops a null one', async () => {
    m(oauth.buildConsentUrl).mockResolvedValue('https://accounts.google.com/consent');
    expect(await svc.connectUrl(USER, 'help@duncit.com')).toBe('https://accounts.google.com/consent');
    expect(oauth.buildConsentUrl).toHaveBeenLastCalledWith(USER, 'help@duncit.com');
    await svc.connectUrl(USER, null);
    expect(oauth.buildConsentUrl).toHaveBeenLastCalledWith(USER, undefined);
  });
});

describe('listAccounts', () => {
  it('lists mailboxes oldest first without tokens, saying which are still connected', async () => {
    const a = await mailbox({ email: 'b@duncit.com', last_polled_at: new Date('2026-03-01T00:00:00Z'), sla_min_hours: 1, sla_max_hours: 1 });
    const b = await mailbox({ email: 'a@duncit.com', refresh_token: '' });
    await setCreatedAt(MailAutomationAccountModel, a._id, '2026-01-01T00:00:00Z');
    await setCreatedAt(MailAutomationAccountModel, b._id, '2026-02-01T00:00:00Z');

    const list = await svc.listAccounts();
    expect(list.map((x) => x.email)).toEqual(['b@duncit.com', 'a@duncit.com']);
    expect(list[0]).toMatchObject({ is_connected: true, last_polled_at: '2026-03-01T00:00:00.000Z', sla_label: '1 hour' });
    expect(list[1]).toMatchObject({
      is_connected: false,
      last_polled_at: null,
      ticket_type: 'SUPPORT',
      sla_label: '24-48 hours',
      reply_template: DEFAULT_REPLY_TEMPLATE,
    });
    expect(list[0]).not.toHaveProperty('refresh_token');
    expect(list[0]).not.toHaveProperty('access_token');
  });
});

describe('completeConnect', () => {
  const tokens = { access_token: 'at', refresh_token: 'rt-new', expires_in: 3600, scope: `${READ} ${SEND} openid`, id_token: 'jwt' };

  const happyGoogle = (email = 'Support@Duncit.com') => {
    m(oauth.verifyOAuthState).mockReturnValue(USER);
    m(oauth.exchangeCode).mockResolvedValue(tokens);
    m(getProfile).mockResolvedValue({ emailAddress: 'profile@duncit.com', historyId: '9001' });
    m(oauth.readIdToken).mockReturnValue({ email, sub: 'google-sub' });
  };

  it('refuses an expired state before talking to Google', async () => {
    m(oauth.verifyOAuthState).mockReturnValue(null);
    await expect(svc.completeConnect('code', 'bad')).rejects.toMatchObject({
      message: 'This connect link has expired. Start again from the Tech portal.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(oauth.exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a grant without a refresh token', async () => {
    happyGoogle();
    m(oauth.exchangeCode).mockResolvedValue({ ...tokens, refresh_token: undefined });
    await expect(svc.completeConnect('code', 's')).rejects.toThrow('Google did not return a refresh token.');
  });

  it.each([
    [`${READ}`, SEND],
    ['', `${READ}, ${SEND}`],
  ])('refuses a grant with scope %p, naming what is missing', async (scope, missing) => {
    happyGoogle();
    m(oauth.exchangeCode).mockResolvedValue({ ...tokens, scope });
    await expect(svc.completeConnect('code', 's')).rejects.toThrow(
      `Connect again and leave every permission ticked — Duncit did not receive: ${missing}.`
    );
    expect(await MailAutomationAccountModel.countDocuments()).toBe(0);
  });

  it('stores a new mailbox at the current history position', async () => {
    happyGoogle();
    const before = Date.now();
    const { account, alreadyConnected } = await svc.completeConnect('code', 's');
    expect(alreadyConnected).toBe(false);
    expect(account).toMatchObject({ email: 'support@duncit.com', is_active: true, is_connected: true, last_error: '' });

    const saved = await MailAutomationAccountModel.findOne().lean();
    expect(saved).toMatchObject({
      google_sub: 'google-sub',
      refresh_token: 'rt-new',
      access_token: 'at',
      granted_scopes: [READ, SEND, 'openid'],
      last_history_id: '9001',
    });
    expect(String(saved?.connected_by)).toBe(USER);
    expect(saved?.access_token_expires_at?.getTime() ?? 0).toBeGreaterThanOrEqual(before + 3600 * 1000);
  });

  it('repairs an existing mailbox without resetting the rule Support wrote', async () => {
    await mailbox({ email: 'support@duncit.com', reply_template: TEMPLATE, is_active: false, ticket_type: 'GRIEVANCE', last_error: 'revoked' });
    happyGoogle();
    const { account, alreadyConnected } = await svc.completeConnect('code', 's');
    expect(alreadyConnected).toBe(true);
    expect(account).toMatchObject({ reply_template: TEMPLATE, is_active: false, ticket_type: 'GRIEVANCE', last_error: '' });
    expect(await MailAutomationAccountModel.countDocuments()).toBe(1);
  });

  it('falls back to the Gmail profile address, and refuses when neither names the mailbox', async () => {
    happyGoogle('');
    expect((await svc.completeConnect('code', 's')).account.email).toBe('profile@duncit.com');

    m(getProfile).mockResolvedValue({ emailAddress: '', historyId: '1' });
    await expect(svc.completeConnect('code', 's')).rejects.toThrow('Google did not say which mailbox was connected');
  });
});

describe('disconnect', () => {
  it.each(['nope', new Types.ObjectId().toHexString()])('refuses unknown mailbox %s', async (id) => {
    await expect(svc.disconnect(id)).rejects.toMatchObject({ message: 'Unknown mailbox', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('forgets the mailbox but keeps its thread rows', async () => {
    const acc = await mailbox();
    await MailAutomationThreadModel.create({ mailbox_email: 'support@duncit.com', gmail_thread_id: 't1', ticket_type: 'SUPPORT' });
    expect(await svc.disconnect(String(acc._id))).toBe(true);
    expect(await MailAutomationAccountModel.countDocuments()).toBe(0);
    expect(await MailAutomationThreadModel.countDocuments()).toBe(1);
  });
});

describe('updateRule', () => {
  it('saves the template, queue, AI switch, active flag and window', async () => {
    const acc = await mailbox();
    const out = await svc.updateRule({
      id: String(acc._id),
      reply_template: `  ${TEMPLATE}  `,
      ticket_type: 'REPORT_PROBLEM',
      ai_enabled: false,
      is_active: false,
      sla_min_hours: 4,
      sla_max_hours: 4,
    });
    expect(out).toMatchObject({ reply_template: TEMPLATE, ticket_type: 'REPORT_PROBLEM', ai_enabled: false, is_active: false, sla_label: '4 hours' });
    expect(await MailAutomationAccountModel.findById(acc._id).lean()).toMatchObject({ reply_template: TEMPLATE, sla_min_hours: 4 });
  });

  it('leaves unset (null/undefined) fields alone and fills one window end from the saved one', async () => {
    const acc = await mailbox({ reply_template: TEMPLATE, ai_enabled: true, ticket_type: 'GRIEVANCE' });
    const out = await svc.updateRule({
      id: String(acc._id),
      reply_template: null,
      ticket_type: null,
      ai_enabled: null,
      is_active: undefined,
      sla_max_hours: 72,
    });
    expect(out).toMatchObject({ reply_template: TEMPLATE, ai_enabled: true, is_active: true, ticket_type: 'GRIEVANCE', sla_min_hours: 24, sla_max_hours: 72 });
  });

  it.each([
    [{ reply_template: '   ' }, 'The reply message cannot be empty'],
    [{ reply_template: 'Thanks!' }, 'The reply message must include {{ticket_no}} — it is the reference the sender quotes back.'],
    [{ sla_min_hours: 0 }, 'Response window must be at least 1 hour'],
    [{ sla_max_hours: 0, sla_min_hours: 1 }, 'Response window must be at least 1 hour'],
    [{ sla_max_hours: 721 }, 'Response window cannot exceed 720 hours (30 days)'],
    [{ sla_min_hours: 721, sla_max_hours: 10 }, 'Response window cannot exceed 720 hours (30 days)'],
    [{ sla_min_hours: 49 }, 'Minimum hours cannot be greater than maximum hours'],
  ])('refuses %p without saving', async (patch, message) => {
    const acc = await mailbox();
    await expect(svc.updateRule({ id: String(acc._id), ...patch })).rejects.toMatchObject({ message });
    expect(await MailAutomationAccountModel.findById(acc._id).lean()).toMatchObject({
      reply_template: DEFAULT_REPLY_TEMPLATE,
      sla_min_hours: 24,
      sla_max_hours: 48,
    });
  });

  it('accepts the 720-hour ceiling', async () => {
    const acc = await mailbox();
    expect((await svc.updateRule({ id: String(acc._id), sla_min_hours: 720, sla_max_hours: 720 })).sla_max_hours).toBe(720);
  });
});

describe('preview', () => {
  it('composes from the typed rule without saving it', async () => {
    const acc = await mailbox();
    m(previewReply).mockResolvedValue({ text: 'Hi there, ticket SUP-1', byAi: true });
    const out = await svc.preview({
      id: String(acc._id),
      reply_template: TEMPLATE,
      ticket_type: 'GRIEVANCE',
      ai_enabled: false,
      sla_min_hours: 2,
      sla_max_hours: 6,
    });
    expect(out).toEqual({ text: 'Hi there, ticket SUP-1', by_ai: true });
    expect(m(previewReply).mock.calls[0][0]).toMatchObject({
      reply_template: TEMPLATE,
      ticket_type: 'GRIEVANCE',
      ai_enabled: false,
      sla_min_hours: 2,
      sla_max_hours: 6,
    });
    expect(await MailAutomationAccountModel.findById(acc._id).lean()).toMatchObject({
      reply_template: DEFAULT_REPLY_TEMPLATE,
      ticket_type: 'SUPPORT',
      ai_enabled: true,
      sla_min_hours: 24,
    });
  });

  it('previews the saved rule when nothing was typed', async () => {
    const acc = await mailbox({ reply_template: TEMPLATE });
    m(previewReply).mockResolvedValue({ text: 'saved', byAi: false });
    expect(await svc.preview({ id: String(acc._id), ai_enabled: null })).toEqual({ text: 'saved', by_ai: false });
    expect(m(previewReply).mock.calls[0][0]).toMatchObject({ reply_template: TEMPLATE, ai_enabled: true, sla_min_hours: 24, sla_max_hours: 48 });
  });

  it('refuses an impossible window', async () => {
    const acc = await mailbox();
    await expect(svc.preview({ id: String(acc._id), sla_min_hours: 10, sla_max_hours: 5 })).rejects.toThrow(
      'Minimum hours cannot be greater than maximum hours'
    );
    expect(previewReply).not.toHaveBeenCalled();
  });
});

describe('recentThreads', () => {
  const thread = async (id: string, iso: string, over: Record<string, unknown> = {}) => {
    const doc = await MailAutomationThreadModel.create({
      mailbox_email: 'support@duncit.com',
      gmail_thread_id: id,
      ticket_type: 'SUPPORT',
      from_email: `${id}@example.com`,
      ...over,
    });
    await setCreatedAt(MailAutomationThreadModel, doc._id, iso);
  };

  it('lists this mailbox only, newest first, clamping the limit', async () => {
    const acc = await mailbox();
    await thread('t1', '2026-01-01T00:00:00Z', { ticket_no: 'SUP-1', replied_at: new Date('2026-01-01T01:00:00Z'), reply_by_ai: true });
    await thread('t2', '2026-01-02T00:00:00Z', { reply_error: 'quota' });
    await thread('t3', '2026-01-03T00:00:00Z', { mailbox_email: 'other@duncit.com' });

    const all = await svc.recentThreads(String(acc._id));
    expect(all.map((t) => t.from_email)).toEqual(['t2@example.com', 't1@example.com']);
    expect(all[0]).toMatchObject({ replied_at: null, reply_error: 'quota', created_at: '2026-01-02T00:00:00.000Z' });
    expect(all[1]).toMatchObject({ ticket_no: 'SUP-1', replied_at: '2026-01-01T01:00:00.000Z', reply_by_ai: true });

    expect(await svc.recentThreads(String(acc._id), 0)).toHaveLength(1);
    expect(await svc.recentThreads(String(acc._id), -3)).toHaveLength(1);
    expect(await svc.recentThreads(String(acc._id), 500)).toHaveLength(2);
  });

  it('refuses an unknown mailbox', async () => {
    await expect(svc.recentThreads('bad')).rejects.toThrow('Unknown mailbox');
  });
});

describe('accessTokenFor', () => {
  it('reuses a token with more than the safety margin left', async () => {
    const acc = await mailbox({ access_token: 'live', access_token_expires_at: new Date(Date.now() + 10 * 60_000) });
    expect(await svc.accessTokenFor(acc)).toBe('live');
    expect(oauth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ['inside the safety margin', { access_token: 'old', access_token_expires_at: new Date(Date.now() + 60_000) }],
    ['with no expiry on record', { access_token: 'old', access_token_expires_at: null }],
    ['with no token at all', { access_token: '', access_token_expires_at: new Date(Date.now() + 3_600_000) }],
  ])('refreshes and persists a token %s', async (_label, over) => {
    const acc = await mailbox(over);
    m(oauth.refreshAccessToken).mockResolvedValue({ access_token: 'fresh', expires_in: 3600, scope: '' });
    expect(await svc.accessTokenFor(acc)).toBe('fresh');
    expect(oauth.refreshAccessToken).toHaveBeenCalledWith('rt');
    const saved = await MailAutomationAccountModel.findById(acc._id).lean();
    expect(saved?.access_token).toBe('fresh');
    expect(saved?.access_token_expires_at?.getTime() ?? 0).toBeGreaterThan(Date.now() + 3_500_000);
  });

  it('refuses a mailbox whose grant is gone', async () => {
    const acc = await mailbox({ refresh_token: '', access_token: '' });
    await expect(svc.accessTokenFor(acc)).rejects.toThrow('Mailbox support@duncit.com is not connected');
  });
});
