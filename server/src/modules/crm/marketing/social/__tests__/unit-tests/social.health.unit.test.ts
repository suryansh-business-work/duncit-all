/**
 * The daily health check: one profile read per account, the verdict written
 * to the row, a dead token flipping the account to EXPIRED, and the owner
 * emailed once a day while the token is a week from lapsing. The model, the
 * readers, the token refresh, the mailer and the user lookup are all faked.
 */
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@services/email/email.service', () => ({ sendHtmlEmail: jest.fn() }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('../../social.model', () => ({
  SocialAccountModel: { findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn() },
}));
jest.mock('../../providers', () => ({ READERS: { X: { profile: jest.fn() }, YOUTUBE: { profile: jest.fn() } } }));
jest.mock('../../social.credentials', () => ({ socialCredentials: jest.fn() }));
jest.mock('../../social.sync', () => ({ freshHandle: jest.fn() }));

import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendHtmlEmail } from '@services/email/email.service';
import { UserModel } from '@modules/access/user/user.model';
import { SocialAccountModel } from '../../social.model';
import { READERS } from '../../providers';
import { SocialApiError } from '../../providers/http';
import { socialCredentials } from '../../social.credentials';
import { freshHandle } from '../../social.sync';
import {
  EXPIRY_ALERT_DAYS,
  accountHealthOf,
  checkAccountHealth,
  runHealthChecks,
  sendExpiryAlert,
  tokenExpiresInDays,
} from '../../social.health';

const m = (fn: unknown) => fn as jest.Mock;
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 31, 12);
const CREDS = { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://api/cb', version: 'v23.0' };

/** A lean query that answers `value` however it is chained. */
const query = (value: unknown) => {
  const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => value };
  return q;
};

const account = (over: Record<string, unknown> = {}) => ({
  _id: 'acc-1',
  provider: 'X',
  platform: 'X',
  external_id: '42',
  name: 'Duncit X',
  handle: 'duncit',
  status: 'CONNECTED',
  access_token: 'AT',
  refresh_token: '',
  meta: {},
  token_expires_at: null,
  health_checked_at: null,
  alerted_at: null,
  owner_user_id: 'owner-1',
  connected_by: 'connector-1',
  ...over,
});

/** The row the health write hands back: the stored doc with the `$set` applied. */
function arrange(doc: Record<string, unknown>) {
  m(SocialAccountModel.findById).mockReturnValue(query(doc));
  m(SocialAccountModel.findOneAndUpdate).mockImplementation((_filter, update: { $set: Record<string, unknown> }) =>
    query({ ...doc, ...update.$set })
  );
}

beforeEach(() => {
  for (const fn of [
    SocialAccountModel.findById,
    SocialAccountModel.findOneAndUpdate,
    SocialAccountModel.updateOne,
    SocialAccountModel.find,
    UserModel.findById,
    READERS.X.profile,
    READERS.YOUTUBE.profile,
    socialCredentials,
    freshHandle,
    sendHtmlEmail,
    getUrlConfigs,
  ]) {
    m(fn).mockReset();
  }
  m(socialCredentials).mockResolvedValue(CREDS);
  m(freshHandle).mockImplementation(async (doc: Record<string, unknown>) => ({ ...doc, access_token: 'fresh' }));
  m(READERS.X.profile).mockResolvedValue({ name: 'Duncit X', handle: 'duncit', avatar_url: '', followers: 1 });
  m(SocialAccountModel.updateOne).mockResolvedValue({ matchedCount: 1 });
  m(getUrlConfigs).mockResolvedValue({ marketingUrl: 'https://marketing.duncit.test/' });
  m(sendHtmlEmail).mockResolvedValue({ skipped: false });
  m(UserModel.findById).mockReturnValue(query({ auth: { email: 'owner@duncit.com' } }));
});

describe('tokenExpiresInDays', () => {
  it('counts whole days up, so a token with 30 hours left shows 2 and one 2 hours gone shows 0', () => {
    expect(tokenExpiresInDays(new Date(NOW + 30 * 3_600_000), NOW)).toBe(2);
    expect(tokenExpiresInDays(new Date(NOW + DAY), NOW)).toBe(1);
    expect(tokenExpiresInDays(new Date(NOW - 2 * 3_600_000), NOW)).toBe(0);
    expect(tokenExpiresInDays(new Date(NOW - 3 * DAY), NOW)).toBe(-3);
    expect(tokenExpiresInDays(new Date(NOW + 7 * DAY).toISOString(), NOW)).toBe(7);
  });

  it('is null for a token that does not expire or a date that cannot be read', () => {
    expect(tokenExpiresInDays(null, NOW)).toBeNull();
    expect(tokenExpiresInDays(undefined, NOW)).toBeNull();
    expect(tokenExpiresInDays('not a date', NOW)).toBeNull();
  });
});

describe('checkAccountHealth', () => {
  it('reads the profile through a fresh token and marks the account healthy', async () => {
    const doc = account({ health_message: 'old', health_ok: false });
    arrange(doc);
    const health = await checkAccountHealth('acc-1', NOW);

    expect(freshHandle).toHaveBeenCalledWith(doc, READERS.X, CREDS);
    expect(READERS.X.profile).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'fresh' }), CREDS);
    expect(SocialAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'acc-1' },
      { $set: { health_ok: true, health_message: '', health_checked_at: new Date(NOW) } },
      { returnDocument: 'after' }
    );
    expect(health).toEqual({
      account_id: 'acc-1',
      platform: 'X',
      name: 'Duncit X',
      status: 'CONNECTED',
      ok: true,
      expired: false,
      message: '',
      expires_in_days: null,
      checked_at: new Date(NOW),
    });
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('flips the account to EXPIRED on a dead token and emails the owner to reconnect', async () => {
    arrange(account());
    m(freshHandle).mockRejectedValue(new SocialApiError('X', 401, 'the access token has expired — reconnect this account', true));
    const health = await checkAccountHealth('acc-1', NOW);

    expect(SocialAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'acc-1' },
      {
        $set: {
          health_ok: false,
          health_message: 'X: the access token has expired — reconnect this account',
          health_checked_at: new Date(NOW),
          status: 'EXPIRED',
          last_error: 'X: the access token has expired — reconnect this account',
        },
      },
      { returnDocument: 'after' }
    );
    expect(health).toMatchObject({ ok: false, expired: true, status: 'EXPIRED' });
    expect(UserModel.findById).toHaveBeenCalledWith('owner-1');
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    const [mail] = m(sendHtmlEmail).mock.calls[0];
    expect(mail).toMatchObject({
      to: 'owner@duncit.com',
      subject: 'Reconnect Duncit X on X',
      category: 'transactional',
      source_detail: 'social-token-expiry',
    });
    expect(mail.html).toContain('its access has expired');
    expect(mail.html).toContain('https://marketing.duncit.test/social/accounts');
    expect(mail.html).not.toContain('AT');
    expect(SocialAccountModel.updateOne).toHaveBeenCalledWith({ _id: 'acc-1' }, { $set: { alerted_at: new Date(NOW) } });
  });

  it('records any other failure on the row and leaves the status alone', async () => {
    arrange(account({ status: 'ERROR' }));
    m(READERS.X.profile).mockRejectedValue(new SocialApiError('X', 429, 'Too Many Requests', false));
    const health = await checkAccountHealth('acc-1', NOW);

    const [, update] = m(SocialAccountModel.findOneAndUpdate).mock.calls[0];
    expect(update.$set).toEqual({ health_ok: false, health_message: 'X: Too Many Requests', health_checked_at: new Date(NOW) });
    expect(health).toMatchObject({ ok: false, expired: false, status: 'ERROR', message: 'X: Too Many Requests' });
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('says the app is not set up when the network has no credentials, without calling out', async () => {
    arrange(account());
    m(socialCredentials).mockResolvedValue(null);
    const health = await checkAccountHealth('acc-1', NOW);
    expect(health?.message).toMatch(/not set up yet/);
    expect(freshHandle).not.toHaveBeenCalled();
    expect(READERS.X.profile).not.toHaveBeenCalled();
  });

  it('keeps a non-Error rejection as text', async () => {
    arrange(account());
    m(READERS.X.profile).mockRejectedValue('socket hang up');
    expect((await checkAccountHealth('acc-1', NOW))?.message).toBe('socket hang up');
  });

  it('is null for an account that is gone, or vanished during the check', async () => {
    m(SocialAccountModel.findById).mockReturnValue(query(null));
    expect(await checkAccountHealth('gone', NOW)).toBeNull();
    expect(freshHandle).not.toHaveBeenCalled();

    m(SocialAccountModel.findById).mockReturnValue(query(account()));
    m(SocialAccountModel.findOneAndUpdate).mockReturnValue(query(null));
    expect(await checkAccountHealth('acc-1', NOW)).toBeNull();
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('warns about a token a week from lapsing, counting the days from the row after the check', async () => {
    arrange(account({ token_expires_at: new Date(NOW + 5 * DAY) }));
    const health = await checkAccountHealth('acc-1', NOW);
    expect(health?.expires_in_days).toBe(5);
    const [mail] = m(sendHtmlEmail).mock.calls[0];
    expect(mail.subject).toBe('Duncit X on X: access expires in 5 days');
    expect(mail.html).toContain('expires in <strong>5 days</strong>');
  });

  it('does not warn about a token with more than a week left', async () => {
    arrange(account({ token_expires_at: new Date(NOW + (EXPIRY_ALERT_DAYS + 1) * DAY) }));
    expect((await checkAccountHealth('acc-1', NOW))?.expires_in_days).toBe(EXPIRY_ALERT_DAYS + 1);
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });
});

describe('sendExpiryAlert', () => {
  const expiring = (over: Record<string, unknown> = {}) => account({ token_expires_at: new Date(NOW + DAY), ...over });
  const healthOf = (doc: ReturnType<typeof account>) => accountHealthOf(doc, { ok: true, expired: false, message: '' }, NOW);

  it('sends once a day at most: a reminder sent an hour ago is not repeated', async () => {
    const recent = expiring({ alerted_at: new Date(NOW - 3_600_000) });
    expect(await sendExpiryAlert(recent, healthOf(recent), NOW)).toBe(false);
    expect(sendHtmlEmail).not.toHaveBeenCalled();

    const yesterday = expiring({ alerted_at: new Date(NOW - DAY - 1) });
    expect(await sendExpiryAlert(yesterday, healthOf(yesterday), NOW)).toBe(true);
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    expect(m(sendHtmlEmail).mock.calls[0][0].subject).toBe('Duncit X on X: access expires in 1 day');
  });

  it('falls back to whoever connected the account when there is no owner', async () => {
    const doc = expiring({ owner_user_id: null });
    expect(await sendExpiryAlert(doc, healthOf(doc), NOW)).toBe(true);
    expect(UserModel.findById).toHaveBeenCalledWith('connector-1');
  });

  it('sends nothing when nobody has an email, and says so', async () => {
    m(UserModel.findById).mockReturnValue(query({ auth: {} }));
    const doc = expiring();
    expect(await sendExpiryAlert(doc, healthOf(doc), NOW)).toBe(false);
    expect(sendHtmlEmail).not.toHaveBeenCalled();
    expect(SocialAccountModel.updateOne).not.toHaveBeenCalled();
    expect(logs.server.warn).toHaveBeenCalledWith('social-accounts', 'expiryAlert', {
      account_id: 'acc-1',
      msg: 'no owner email to send the token reminder to',
    });

    const orphan = expiring({ owner_user_id: null, connected_by: null });
    expect(await sendExpiryAlert(orphan, healthOf(orphan), NOW)).toBe(false);
    expect(UserModel.findById).toHaveBeenCalledTimes(1);
  });

  it('does not count a send the mailer refused, so the next check tries again', async () => {
    m(sendHtmlEmail).mockResolvedValue({ skipped: true, reason: 'No SMTP configured' });
    const doc = expiring();
    expect(await sendExpiryAlert(doc, healthOf(doc), NOW)).toBe(false);
    expect(SocialAccountModel.updateOne).not.toHaveBeenCalled();
    expect(logs.server.warn).toHaveBeenCalledWith('social-accounts', 'expiryAlert', {
      account_id: 'acc-1',
      reason: 'No SMTP configured',
      msg: 'token reminder was not sent',
    });
  });

  it('escapes the account name in the mail body', async () => {
    const doc = expiring({ name: 'Duncit <b>Pets</b> & co' });
    await sendExpiryAlert(doc, healthOf(doc), NOW);
    const [mail] = m(sendHtmlEmail).mock.calls[0];
    expect(mail.html).toContain('Duncit &lt;b&gt;Pets&lt;/b&gt; &amp; co');
    expect(mail.html).not.toContain('<b>Pets</b>');
  });

  it('names the network when the account has no name', async () => {
    const doc = expiring({ name: '', platform: 'YOUTUBE', provider: 'YOUTUBE' });
    await sendExpiryAlert(doc, healthOf(doc), NOW);
    expect(m(sendHtmlEmail).mock.calls[0][0].subject).toBe('YouTube on YouTube: access expires in 1 day');
  });

  it('treats a lapsed, not-yet-EXPIRED token as needing a reconnect', async () => {
    const doc = expiring({ token_expires_at: new Date(NOW - DAY) });
    await sendExpiryAlert(doc, healthOf(doc), NOW);
    expect(m(sendHtmlEmail).mock.calls[0][0].subject).toBe('Reconnect Duncit X on X');
  });
});

describe('runHealthChecks', () => {
  it('checks every account that is not EXPIRED, the longest unchecked first, and skips any that vanished', async () => {
    m(SocialAccountModel.find).mockReturnValue(query([{ _id: 'acc-1' }, { _id: 'gone' }]));
    const docs: Record<string, Record<string, unknown>> = { 'acc-1': account() };
    m(SocialAccountModel.findById).mockImplementation((id: string) => query(docs[id] ?? null));
    m(SocialAccountModel.findOneAndUpdate).mockImplementation((filter: { _id: string }, update: { $set: Record<string, unknown> }) =>
      query({ ...docs[filter._id], ...update.$set })
    );

    const results = await runHealthChecks();
    expect(SocialAccountModel.find).toHaveBeenCalledWith({ status: { $ne: 'EXPIRED' } });
    expect(results.map((r) => r.account_id)).toEqual(['acc-1']);
    expect(results[0].ok).toBe(true);
  });
});
