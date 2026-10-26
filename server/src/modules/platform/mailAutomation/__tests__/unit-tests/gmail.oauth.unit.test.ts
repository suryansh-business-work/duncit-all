import jwt from 'jsonwebtoken';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { outboundFetch } from '@utils/outboundFetch';
import {
  GMAIL_SCOPES,
  buildConsentUrl,
  exchangeCode,
  gmailRedirectUri,
  googleOAuthCredentials,
  readIdToken,
  refreshAccessToken,
  signOAuthState,
  verifyOAuthState,
} from '../../gmail.oauth';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const env = getRuntimeEnvValue as jest.Mock;
const fetchMock = outboundFetch as jest.Mock;
const SECRET = process.env.JWT_SECRET as string;
const configured = () =>
  env.mockImplementation(async (key: string) => ({ GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'csecret' })[key] ?? '');

beforeEach(() => {
  jest.resetAllMocks();
  (getUrlConfigs as jest.Mock).mockResolvedValue({ serverUrl: 'https://api.duncit.test///' });
});

describe('credentials', () => {
  it('derives the redirect from the server url without trailing slashes', async () => {
    await expect(gmailRedirectUri()).resolves.toBe('https://api.duncit.test/gmail/oauth/callback');
  });

  it('is null until Tech has saved both the client id and the secret', async () => {
    env.mockResolvedValue('');
    await expect(googleOAuthCredentials()).resolves.toBeNull();
    env.mockImplementation(async (key: string) => (key === 'GOOGLE_CLIENT_ID' ? 'cid' : ''));
    await expect(googleOAuthCredentials()).resolves.toBeNull();
    env.mockImplementation(async (key: string) => (key === 'GOOGLE_CLIENT_SECRET' ? 'csecret' : ''));
    await expect(googleOAuthCredentials()).resolves.toBeNull();
    configured();
    await expect(googleOAuthCredentials()).resolves.toEqual({
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://api.duncit.test/gmail/oauth/callback',
    });
  });
});

describe('the signed state', () => {
  it('round-trips the user who started the connection', () => {
    expect(verifyOAuthState(signOAuthState('user-1'))).toBe('user-1');
  });

  it('refuses a forged, expired or foreign token', () => {
    expect(verifyOAuthState('not-a-token')).toBeNull();
    expect(verifyOAuthState(jwt.sign({ uid: 'u', purpose: 'gmail_connect' }, 'another-secret'))).toBeNull();
    expect(verifyOAuthState(jwt.sign({ uid: 'u', purpose: 'password_reset' }, SECRET))).toBeNull();
    expect(verifyOAuthState(jwt.sign({ uid: 'u', purpose: 'gmail_connect' }, SECRET, { expiresIn: -10 }))).toBeNull();
  });

  it('answers null for a signed state that names nobody', () => {
    expect(verifyOAuthState(jwt.sign({ purpose: 'gmail_connect' }, SECRET))).toBeNull();
  });

  it('signs and verifies consistently on a server started without a JWT secret', () => {
    delete process.env.JWT_SECRET;
    try {
      expect(verifyOAuthState(signOAuthState('user-2'))).toBe('user-2');
    } finally {
      process.env.JWT_SECRET = SECRET;
    }
  });
});

describe('buildConsentUrl', () => {
  it('asks for the mailbox scopes offline with consent, carrying a state that names the user', async () => {
    configured();
    const url = new URL(await buildConsentUrl('user-1'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('scope')).toBe(GMAIL_SCOPES.join(' '));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.has('login_hint')).toBe(false);
    expect(verifyOAuthState(url.searchParams.get('state') as string)).toBe('user-1');
  });

  it('passes a login hint when one is given', async () => {
    configured();
    expect(new URL(await buildConsentUrl('user-1', 'help@duncit.com')).searchParams.get('login_hint')).toBe('help@duncit.com');
  });

  it('says Google OAuth is not configured, with a code the portal can act on', async () => {
    env.mockResolvedValue('');
    await expect(buildConsentUrl('user-1')).rejects.toMatchObject({
      message: expect.stringContaining('Google OAuth is not configured'),
      extensions: { code: 'MAIL_AUTOMATION_NOT_CONFIGURED' },
    });
  });
});

describe('token requests', () => {
  const reply = (ok: boolean, status: number, body: unknown) => ({ ok, status, json: async () => body });

  it('exchanges the one-time code with the client credentials', async () => {
    configured();
    fetchMock.mockResolvedValue(reply(true, 200, { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 's' }));
    await expect(exchangeCode('the-code')).resolves.toMatchObject({ access_token: 'at', refresh_token: 'rt' });
    const [, url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      code: 'the-code',
      client_id: 'cid',
      client_secret: 'csecret',
      redirect_uri: 'https://api.duncit.test/gmail/oauth/callback',
      grant_type: 'authorization_code',
    });
  });

  it('refreshes an access token from the stored refresh token', async () => {
    configured();
    fetchMock.mockResolvedValue(reply(true, 200, { access_token: 'fresh', expires_in: 3600, scope: 's' }));
    await expect(refreshAccessToken('rt-1')).resolves.toMatchObject({ access_token: 'fresh' });
    expect(Object.fromEntries(new URLSearchParams(fetchMock.mock.calls[0][2].body))).toEqual({
      refresh_token: 'rt-1',
      client_id: 'cid',
      client_secret: 'csecret',
      grant_type: 'refresh_token',
    });
  });

  it('refuses both without a configured client', async () => {
    env.mockResolvedValue('');
    await expect(exchangeCode('c')).rejects.toMatchObject({ extensions: { code: 'MAIL_AUTOMATION_NOT_CONFIGURED' } });
    await expect(refreshAccessToken('r')).rejects.toMatchObject({ extensions: { code: 'MAIL_AUTOMATION_NOT_CONFIGURED' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the description', { error_description: 'Bad code', error: 'invalid_grant' }, 'Bad code'],
    ['the error code when there is no description', { error: 'invalid_grant' }, 'invalid_grant'],
    ['the status when the body says nothing', {}, 'HTTP 400'],
  ])('reports %s of a refused request', async (_label, body, reason) => {
    configured();
    fetchMock.mockResolvedValue(reply(false, 400, body));
    await expect(exchangeCode('c')).rejects.toThrow(`Google token request failed: ${reason}`);
  });

  it('treats a 200 without an access token as a failure, and an unreadable body as empty', async () => {
    configured();
    fetchMock.mockResolvedValueOnce(reply(true, 200, { expires_in: 1 }));
    await expect(exchangeCode('c')).rejects.toThrow('Google token request failed: HTTP 200');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => Promise.reject(new Error('html')) });
    await expect(exchangeCode('c')).rejects.toThrow('Google token request failed: HTTP 502');
  });
});

describe('readIdToken', () => {
  const idToken = (claims: unknown) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

  it('reads the lower-cased email and the subject', () => {
    expect(readIdToken(idToken({ email: 'Help@Duncit.com', sub: '123' }))).toEqual({ email: 'help@duncit.com', sub: '123' });
  });

  it('answers empty fields for claims that name neither', () => {
    expect(readIdToken(idToken({}))).toEqual({ email: '', sub: '' });
  });

  it('answers empty for a missing token, a token with no payload and a payload that is not JSON', () => {
    expect(readIdToken(undefined)).toEqual({ email: '', sub: '' });
    expect(readIdToken('header-only')).toEqual({ email: '', sub: '' });
    expect(readIdToken(`h.${Buffer.from('not json').toString('base64url')}.s`)).toEqual({ email: '', sub: '' });
  });
});
