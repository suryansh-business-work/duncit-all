/**
 * Instagram and Facebook through Facebook Login for Business (Unified login):
 * the consent URL with and without a Login configuration, the code → token →
 * debug_token → assets handshake for a user token and for a never-expiring
 * system-user token, revoking, and the Test connection probe. The outbound
 * fetch is faked and the clock frozen; every URL, parameter and mapped
 * account is asserted.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { META_LOGIN_SCOPES, debugToken, metaLoginConnector, probeMetaLogin } from '../../providers/meta.login';
import type { SocialAccountHandle } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;
const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const SIXTY_DAYS_S = 5_184_000;
const GRAPH = 'https://graph.facebook.com/v23.0';
const CREDS = { clientId: 'app-1', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v23.0', configId: '' };
const WITH_CONFIG = { ...CREDS, configId: '29334365832857529' };
const IG_FIELDS = 'id,username,name,profile_picture_url,followers_count';
const PAGE_FIELDS = `id,name,username,link,access_token,followers_count,fan_count,picture{url},instagram_business_account{${IG_FIELDS}}`;
const GRANTED = ['instagram_basic', 'instagram_manage_messages', 'pages_show_list'];

const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers() });
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};
const at = (call: number) => {
  const url = new URL(mockFetch.mock.calls[call][1]);
  return { endpoint: `${url.origin}${url.pathname}`, params: Object.fromEntries(url.searchParams) };
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockFetch.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('authorizeUrl', () => {
  it('names the Login configuration and sends no scope when one is set — Meta takes the permissions from it', () => {
    const url = new URL(metaLoginConnector.authorizeUrl({ creds: WITH_CONFIG, state: 'st-1', challenge: 'unused' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://www.facebook.com/v23.0/dialog/oauth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'app-1',
      redirect_uri: CREDS.redirectUri,
      state: 'st-1',
      response_type: 'code',
      config_id: '29334365832857529',
    });
  });

  it('asks for the default permission list, never the retired instagram_business_* ones, without a configuration', () => {
    const url = new URL(metaLoginConnector.authorizeUrl({ creds: CREDS, state: 'st-2', challenge: 'unused' }));
    expect(url.searchParams.get('config_id')).toBeNull();
    expect(url.searchParams.get('scope')).toBe(META_LOGIN_SCOPES.join(','));
    expect(url.searchParams.get('scope')).toContain('instagram_manage_messages');
    expect(url.searchParams.get('scope')).not.toContain('instagram_business_');
  });

  it('asks Meta to prompt again for declined permissions on a Reconnect, and only then', () => {
    const reconnect = new URL(metaLoginConnector.authorizeUrl({ creds: WITH_CONFIG, state: 'st-3', challenge: 'unused', reauth: true }));
    expect(reconnect.searchParams.get('auth_type')).toBe('rerequest');
    expect(reconnect.searchParams.get('config_id')).toBe('29334365832857529');
    const plain = new URL(metaLoginConnector.authorizeUrl({ creds: WITH_CONFIG, state: 'st-4', challenge: 'unused', reauth: false }));
    expect(plain.searchParams.get('auth_type')).toBeNull();
  });
});

describe('debugToken', () => {
  it("asks with the app's own token and answers the token's data, or nothing when Graph sends none", async () => {
    queue({ data: { scopes: ['instagram_basic'], expires_at: 0 } }, {});
    await expect(debugToken(CREDS, 'user-tok')).resolves.toEqual({ scopes: ['instagram_basic'], expires_at: 0 });
    expect(at(0)).toEqual({ endpoint: `${GRAPH}/debug_token`, params: { input_token: 'user-tok', access_token: 'app-1|shh' } });
    await expect(debugToken(CREDS, 'user-tok')).resolves.toEqual({});
  });
});

describe('connect with a user token', () => {
  const page = {
    id: 'p1',
    name: 'Duncit',
    username: 'duncitpage',
    link: 'https://www.facebook.com/duncitpage',
    access_token: 'page-1',
    followers_count: 1200,
    picture: { data: { url: 'https://cdn/p1.jpg' } },
    instagram_business_account: { id: 'ig1', username: 'duncit_app', name: 'Duncit', profile_picture_url: 'https://cdn/ig1.jpg', followers_count: 300 },
  };

  it('swaps the code, reads what the token may do, makes it long-lived, and stores each Page with its linked Instagram account', async () => {
    queue(
      { access_token: 'short' },
      { data: { scopes: GRANTED, expires_at: Math.floor(NOW / 1000) + 3600 } },
      { access_token: 'long', expires_in: SIXTY_DAYS_S },
      { data: [page, { id: 'p2', access_token: 'page-2', fan_count: 7 }] }
    );
    const found = await metaLoginConnector.connect({ code: 'the-code', creds: CREDS, verifier: '' });

    expect(at(0)).toEqual({
      endpoint: `${GRAPH}/oauth/access_token`,
      params: { client_id: 'app-1', client_secret: 'shh', redirect_uri: CREDS.redirectUri, code: 'the-code' },
    });
    expect(at(1).params.input_token).toBe('short');
    expect(at(2)).toEqual({
      endpoint: `${GRAPH}/oauth/access_token`,
      params: { client_id: 'app-1', client_secret: 'shh', grant_type: 'fb_exchange_token', fb_exchange_token: 'short' },
    });
    expect(at(3)).toEqual({ endpoint: `${GRAPH}/me/accounts`, params: { fields: PAGE_FIELDS, limit: '100', access_token: 'long' } });

    const pageTokens = { access_token: 'page-1', refresh_token: '', expires_at: null, scopes: GRANTED };
    expect(found).toEqual([
      {
        platform: 'FACEBOOK',
        external_id: 'p1',
        name: 'Duncit',
        handle: 'duncitpage',
        avatar_url: 'https://cdn/p1.jpg',
        profile_url: 'https://www.facebook.com/duncitpage',
        followers: 1200,
        tokens: pageTokens,
        meta: { login: 'FACEBOOK', instagram_id: 'ig1' },
      },
      {
        platform: 'INSTAGRAM',
        external_id: 'ig1',
        name: 'Duncit',
        handle: 'duncit_app',
        avatar_url: 'https://cdn/ig1.jpg',
        profile_url: 'https://www.instagram.com/duncit_app',
        followers: 300,
        tokens: pageTokens,
        meta: { login: 'FACEBOOK', page_id: 'p1' },
      },
      expect.objectContaining({
        platform: 'FACEBOOK',
        external_id: 'p2',
        name: 'p2',
        handle: '',
        avatar_url: '',
        profile_url: 'https://www.facebook.com/p2',
        followers: 7,
        meta: { login: 'FACEBOOK', instagram_id: '' },
      }),
    ]);
    // A Page that is not linked to Instagram adds no Instagram account.
    expect(found.filter((account) => account.platform === 'INSTAGRAM')).toHaveLength(1);
  });

  it('falls back to the login token, with its expiry, for a Page Graph sent no token for', async () => {
    queue(
      { access_token: 'short' },
      { data: { scopes: GRANTED, expires_at: 99 } },
      { access_token: 'long', expires_in: SIXTY_DAYS_S },
      { data: [{ id: 'p3', name: 'No token' }] }
    );
    const [only] = await metaLoginConnector.connect({ code: 'c', creds: CREDS, verifier: '' });
    expect(only.tokens).toEqual({ access_token: 'long', refresh_token: '', expires_at: new Date(NOW + SIXTY_DAYS_S * 1000), scopes: GRANTED });
  });

  it('connects nothing, and asks nothing more, when the token reaches no Page and was granted no asset', async () => {
    queue({ access_token: 'short' }, { data: {} }, { access_token: 'long' }, {});
    await expect(metaLoginConnector.connect({ code: 'c', creds: CREDS, verifier: '' })).resolves.toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});

describe('connect with a system-user token from a Login configuration', () => {
  it('keeps the never-expiring token as issued, finds the Pages and lone Instagram accounts from its grant', async () => {
    queue(
      { access_token: 'system' },
      {
        data: {
          expires_at: 0,
          scopes: GRANTED,
          granular_scopes: [
            { scope: 'pages_show_list', target_ids: ['p1'] },
            { scope: 'instagram_basic', target_ids: ['ig1', 'ig2'] },
            { scope: 'instagram_manage_messages', target_ids: ['ig2'] },
            { scope: 'ads_read' },
          ],
        },
      },
      { data: [] },
      { id: 'p1', name: 'Duncit', access_token: 'page-1', instagram_business_account: { id: 'ig1', username: 'duncit_app' } },
      { id: 'ig2', username: 'second' }
    );
    const found = await metaLoginConnector.connect({ code: 'c', creds: WITH_CONFIG, verifier: '' });

    // No long-lived swap: the next call after debug_token is the Page listing.
    expect(at(2).endpoint).toBe(`${GRAPH}/me/accounts`);
    expect(at(3)).toEqual({ endpoint: `${GRAPH}/p1`, params: { fields: PAGE_FIELDS, access_token: 'system' } });
    expect(at(4)).toEqual({ endpoint: `${GRAPH}/ig2`, params: { fields: IG_FIELDS, access_token: 'system' } });
    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(found.map((account) => `${account.platform}:${account.external_id}`)).toEqual(['FACEBOOK:p1', 'INSTAGRAM:ig1', 'INSTAGRAM:ig2']);
    expect(found[2]).toEqual({
      platform: 'INSTAGRAM',
      external_id: 'ig2',
      name: 'second',
      handle: 'second',
      avatar_url: '',
      profile_url: 'https://www.instagram.com/second',
      followers: 0,
      tokens: { access_token: 'system', refresh_token: '', expires_at: null, scopes: GRANTED },
      meta: { login: 'FACEBOOK', page_id: '' },
    });
  });

  it('names a lone Instagram account by its id when Graph knows no name for it', async () => {
    queue({ access_token: 'system' }, { data: { expires_at: 0, granular_scopes: [{ scope: 'instagram_basic', target_ids: ['ig9'] }] } }, {}, { id: 'ig9' });
    const [only] = await metaLoginConnector.connect({ code: 'c', creds: WITH_CONFIG, verifier: '' });
    expect(only).toMatchObject({ external_id: 'ig9', name: 'ig9', handle: '', profile_url: '', tokens: { scopes: [] } });
  });
});

describe('revoke', () => {
  const handle = (provider: 'INSTAGRAM' | 'FACEBOOK', meta: Record<string, string>): SocialAccountHandle => ({
    provider,
    platform: provider,
    external_id: '42',
    handle: 'duncit',
    access_token: 'AT',
    refresh_token: '',
    meta,
  });

  it('only forgets an account from Facebook Login — its grant also serves the accounts connected beside it', async () => {
    await metaLoginConnector.revoke?.(handle('INSTAGRAM', { login: 'FACEBOOK' }), CREDS);
    await metaLoginConnector.revoke?.(handle('FACEBOOK', { login: 'FACEBOOK' }), CREDS);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('de-authorises an older account on the host its token belongs to', async () => {
    queue({ success: true }, { success: true });
    await metaLoginConnector.revoke?.(handle('INSTAGRAM', {}), CREDS);
    await metaLoginConnector.revoke?.(handle('FACEBOOK', {}), CREDS);
    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      'https://graph.instagram.com/v23.0/me/permissions?access_token=AT',
      `${GRAPH}/me/permissions?access_token=AT`,
    ]);
  });
});

describe('probeMetaLogin', () => {
  it('proves the keys with an app token and names the Login configuration Connect will use', async () => {
    queue({ access_token: 'app|tok' }, { name: 'Duncit Social' });
    await expect(probeMetaLogin('Instagram')(WITH_CONFIG)).resolves.toEqual({
      ok: true,
      message: 'Instagram accepted the App ID and Secret (Duncit Social). Connect uses the Login for Business configuration 29334365832857529.',
    });
    expect(at(0).params).toEqual({ client_id: 'app-1', client_secret: 'shh', grant_type: 'client_credentials' });
  });

  it('passes without a configuration but says where to find one', async () => {
    queue({ access_token: 'app|tok' }, {});
    const outcome = await probeMetaLogin('Facebook')(CREDS);
    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBe(
      'Facebook accepted the App ID and Secret. No Login configuration ID is set, so Connect asks for the default permission list. Add the configuration ID from Use cases › Instagram API › API setup with Unified login.'
    );
  });

  it('relays a refused pair as it came, without the configuration line', async () => {
    mockFetch.mockResolvedValueOnce(reply({ error: { message: 'Error validating client secret.', code: 1 } }, 400));
    await expect(probeMetaLogin('Instagram')(WITH_CONFIG)).resolves.toEqual({
      ok: false,
      message: 'Instagram rejected the App ID or Secret — Facebook: Error validating client secret.',
    });
  });
});
