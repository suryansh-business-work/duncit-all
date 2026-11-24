/**
 * Connect with Google for Intel's Gmail source: the callback keeps the
 * mailbox's refresh token sealed, gives each mailbox one connector (BOTH),
 * refuses tokens without read access or without a refresh token, and
 * disconnecting removes the connector, its index and Google's grant.
 */
import { openToken } from '@modules/crm/marketing/social/social.tokens';
import { buildConsentUrl, exchangeCode, googleOAuthCredentials, INTEL_GMAIL_PURPOSE, INTEL_GMAIL_SCOPES, readIdToken, verifyOAuthState } from '@modules/platform/mailAutomation/gmail.oauth';
import { writeAudit } from '../../audit/intelAudit.service';
import { gmailAccountEntry } from '../../connectors/gmail/gmailAccount.entry';
import { IntelGmailAccountModel } from '../../connectors/gmail/gmailAccount.model';
import { intelGmailAccounts } from '../../connectors/gmail/gmailAccount.service';
import { IntelConnectorModel } from '../../connectors/intelConnector.model';
import { removeConnectorDocuments } from '../../index/intel.indexer';
import { scheduleSync } from '../../sync/intelSync.queue';

jest.mock('@modules/platform/mailAutomation/gmail.oauth', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/gmail.oauth'),
  buildConsentUrl: jest.fn(),
  exchangeCode: jest.fn(),
  googleOAuthCredentials: jest.fn(),
  readIdToken: jest.fn(),
  verifyOAuthState: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn(async () => ({ intelUrl: 'https://intel.example.test/' })) }));
jest.mock('../../connectors/gmail/gmailAccount.model', () => ({ IntelGmailAccountModel: { findOneAndUpdate: jest.fn(), find: jest.fn(), findById: jest.fn(), deleteOne: jest.fn() } }));
jest.mock('../../connectors/intelConnector.model', () => ({ IntelConnectorModel: { exists: jest.fn(), create: jest.fn(), find: jest.fn(), deleteOne: jest.fn() } }));
jest.mock('../../sync/intelSync.queue', () => ({ scheduleSync: jest.fn() }));
jest.mock('../../index/intel.indexer', () => ({ removeConnectorDocuments: jest.fn() }));
jest.mock('../../audit/intelAudit.service', () => ({ writeAudit: jest.fn() }));

const USER = '64b7f0c2a1b2c3d4e5f60701';
const ACCOUNT = '64b7f0c2a1b2c3d4e5f60718';
const READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const actor = { user: { id: USER }, level: 'ADMIN' } as never;
const lean = <T>(value: T) => ({ lean: () => Promise.resolve(value), select: () => ({ lean: () => Promise.resolve(value) }) });

const account = IntelGmailAccountModel as unknown as Record<string, jest.Mock>;
const connector = IntelConnectorModel as unknown as Record<string, jest.Mock>;
const realFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'unit-test-secret';
  (verifyOAuthState as jest.Mock).mockReturnValue(USER);
  (exchangeCode as jest.Mock).mockResolvedValue({ access_token: 'at', refresh_token: 'rt-123', scope: `openid ${READONLY}`, expires_in: 3600, id_token: 'id' });
  (readIdToken as jest.Mock).mockReturnValue({ email: 'team@duncit.test', sub: 'sub-1' });
  account.findOneAndUpdate.mockReturnValue(lean({ _id: ACCOUNT, email: 'team@duncit.test' }));
  connector.exists.mockResolvedValue(null);
  connector.create.mockImplementation(async (doc: Record<string, unknown>) => ({ _id: 'c1', ...doc }));
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const redirect = (query: Partial<{ code: string; state: string; denied: string }>) => intelGmailAccounts.callbackRedirect({ code: '', state: '', denied: '', ...query });

describe('callbackRedirect', () => {
  it('sends a cancelled sign-in back to Settings › Gmail with the reason', async () => {
    expect(await redirect({ denied: 'access_denied', state: 's' })).toBe('https://intel.example.test/setting/gmail?error=access_denied');
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('keeps the mailbox with its token sealed, creates its connector and queues the first sync', async () => {
    const url = new URL(await redirect({ code: 'code', state: 'state' }));
    expect(url.searchParams.get('connected')).toBe('team@duncit.test');
    expect(verifyOAuthState).toHaveBeenCalledWith('state', INTEL_GMAIL_PURPOSE);
    const [filter, update] = account.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ email: 'team@duncit.test' });
    expect(update.$set.refresh_token).not.toBe('rt-123');
    expect(openToken(update.$set.refresh_token)).toBe('rt-123');
    expect(connector.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'GMAIL', environment: 'BOTH', env_entry_id: 'oauth', config: expect.objectContaining({ account_id: ACCOUNT, query: 'in:inbox' }) }));
    expect(scheduleSync).toHaveBeenCalledWith(expect.objectContaining({ kind: 'GMAIL' }), 'FULL', 'CREATE', USER);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'gmail.connect', target: 'team@duncit.test' }));
  });

  it('reconnecting a mailbox replaces its token but adds no second connector', async () => {
    connector.exists.mockResolvedValueOnce({ _id: 'c1' });
    await redirect({ code: 'code', state: 'state' });
    expect(account.findOneAndUpdate).toHaveBeenCalled();
    expect(connector.create).not.toHaveBeenCalled();
  });

  it('names the connector differently when an older connector already uses the address', async () => {
    connector.exists.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: 'legacy' });
    await redirect({ code: 'code', state: 'state' });
    expect(connector.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'team@duncit.test (Google)' }));
  });

  it('refuses a stale or foreign state before talking to Google', async () => {
    (verifyOAuthState as jest.Mock).mockReturnValue(null);
    const url = new URL(await redirect({ code: 'code', state: 'forged' }));
    expect(url.searchParams.get('error')).toMatch(/expired or was not started from Intel/);
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a grant without Gmail read access', async () => {
    (exchangeCode as jest.Mock).mockResolvedValue({ access_token: 'at', refresh_token: 'rt', scope: 'openid', expires_in: 1 });
    const url = new URL(await redirect({ code: 'code', state: 'state' }));
    expect(url.searchParams.get('error')).toMatch(/read access was not granted/);
    expect(account.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a grant without a refresh token', async () => {
    (exchangeCode as jest.Mock).mockResolvedValue({ access_token: 'at', scope: READONLY, expires_in: 1 });
    const url = new URL(await redirect({ code: 'code', state: 'state' }));
    expect(url.searchParams.get('error')).toMatch(/refresh token/);
    expect(account.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses when Google does not say which mailbox it is', async () => {
    (readIdToken as jest.Mock).mockReturnValue({ email: '', sub: '' });
    const url = new URL(await redirect({ code: 'code', state: 'state' }));
    expect(url.searchParams.get('error')).toMatch(/which mailbox/);
  });
});

describe('connectUrl', () => {
  it('asks Google for read-only access, signed for Intel', async () => {
    (googleOAuthCredentials as jest.Mock).mockResolvedValue({ clientId: 'id', clientSecret: 'secret', redirectUri: 'https://server/gmail/oauth/callback' });
    (buildConsentUrl as jest.Mock).mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth?x=1');
    await expect(intelGmailAccounts.connectUrl(actor)).resolves.toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1');
    expect(buildConsentUrl).toHaveBeenCalledWith(USER, undefined, { scopes: INTEL_GMAIL_SCOPES, purpose: INTEL_GMAIL_PURPOSE });
    expect(INTEL_GMAIL_SCOPES).not.toContain('https://www.googleapis.com/auth/gmail.send');
  });

  it('says what to set up when Google OAuth is not configured', async () => {
    (googleOAuthCredentials as jest.Mock).mockResolvedValue(null);
    await expect(intelGmailAccounts.connectUrl(actor)).rejects.toMatchObject({ extensions: { code: 'FAILED_PRECONDITION' } });
  });
});

describe('disconnect', () => {
  it('removes the connector, its index and the account, and revokes the grant at Google', async () => {
    account.findById.mockReturnValue(lean({ _id: ACCOUNT, email: 'team@duncit.test', refresh_token: 'rt-plain' }));
    connector.find.mockReturnValue(lean([{ _id: 'c1' }, { _id: 'c2' }]));
    (removeConnectorDocuments as jest.Mock).mockResolvedValue(3);
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(intelGmailAccounts.disconnect(actor, ACCOUNT)).resolves.toBe(true);
    expect(connector.deleteOne).toHaveBeenCalledTimes(2);
    expect(account.deleteOne).toHaveBeenCalledWith({ _id: ACCOUNT });
    expect(fetchMock).toHaveBeenCalledWith('https://oauth2.googleapis.com/revoke', expect.objectContaining({ method: 'POST' }));
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'gmail.disconnect', detail: '6 indexed document(s) removed' }));
  });

  it('still removes the account when Google cannot be reached to revoke', async () => {
    account.findById.mockReturnValue(lean({ _id: ACCOUNT, email: 'team@duncit.test', refresh_token: 'rt-plain' }));
    connector.find.mockReturnValue(lean([]));
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(intelGmailAccounts.disconnect(actor, ACCOUNT)).resolves.toBe(true);
    expect(account.deleteOne).toHaveBeenCalled();
  });

  it('answers NOT_FOUND for an unknown or malformed id', async () => {
    await expect(intelGmailAccounts.disconnect(actor, 'nope')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    account.findById.mockReturnValue(lean(null));
    await expect(intelGmailAccounts.disconnect(actor, ACCOUNT)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('list and gmailAccountEntry', () => {
  it('lists each mailbox with the connector that indexes it', async () => {
    const at = new Date('2026-11-24T10:00:00Z');
    account.find.mockReturnValue({ sort: () => lean([{ _id: ACCOUNT, email: 'team@duncit.test', created_at: at, updated_at: at }]) });
    connector.find.mockReturnValue(lean([{ _id: 'c1', config: { account_id: ACCOUNT } }]));
    await expect(intelGmailAccounts.list()).resolves.toEqual([{ id: ACCOUNT, email: 'team@duncit.test', connected_at: at, updated_at: at, connector_id: 'c1' }]);
  });

  it('gives the Gmail driver the Tech portal OAuth client and the mailbox’s own token', async () => {
    (googleOAuthCredentials as jest.Mock).mockResolvedValue({ clientId: 'cid', clientSecret: 'csecret', redirectUri: 'r' });
    account.findById.mockReturnValue(lean({ _id: ACCOUNT, email: 'team@duncit.test', refresh_token: 'rt-plain' }));
    await expect(gmailAccountEntry(ACCOUNT)).resolves.toEqual({ id: ACCOUNT, name: 'team@duncit.test', config: { client_id: 'cid', client_secret: 'csecret', refresh_token: 'rt-plain', mailbox: 'team@duncit.test' } });
  });

  it('has no entry for a disconnected account, a bad id or a missing OAuth client', async () => {
    await expect(gmailAccountEntry('bad')).resolves.toBeNull();
    (googleOAuthCredentials as jest.Mock).mockResolvedValue(null);
    account.findById.mockReturnValue(lean({ _id: ACCOUNT, email: 'x', refresh_token: 'r' }));
    await expect(gmailAccountEntry(ACCOUNT)).resolves.toBeNull();
  });
});
