/**
 * The Facebook app: the Graph helpers' host and service, the App ID / Secret
 * probe, and Facebook Login's code → long-lived token → Pages handshake. The
 * outbound fetch is faked; what is under test is every URL, host, body and
 * mapped value — and that a Page's linked Instagram account no longer rides
 * along, now that Instagram has an app of its own.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import {
  FACEBOOK_GRAPH,
  FACEBOOK_SERVICE,
  INSTAGRAM_GRAPH,
  INSTAGRAM_SERVICE,
  META_SERVICE,
  facebookConnector,
  graphGet,
  graphPost,
  graphTime,
  graphUrl,
  metaConnector,
  probeFacebookApp,
  probeMetaApp,
} from '../../providers/meta';

const mockFetch = outboundFetch as jest.Mock;

const CREDS = { clientId: 'app-1', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v21.0' };
const PAGE_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'read_insights',
  'business_management',
];

/** A fetch Response stand-in: Graph answers JSON, and the status says whether it is an error. */
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: new Headers(),
});

/** Queue the replies of consecutive Graph calls. */
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};

const serviceOf = (call: number): string => mockFetch.mock.calls[call][0];
const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): RequestInit | undefined => mockFetch.mock.calls[call][2];
/** The call's address and its query, decoded. */
const at = (call: number) => {
  const url = new URL(urlOf(call));
  return { endpoint: `${url.origin}${url.pathname}`, params: Object.fromEntries(url.searchParams) };
};
const formOf = (call: number) => Object.fromEntries(new URLSearchParams(String(initOf(call)?.body)));

beforeEach(() => mockFetch.mockReset());

describe('names and hosts', () => {
  it('keeps the Meta names as aliases of the Facebook ones', () => {
    expect(FACEBOOK_SERVICE).toBe('Facebook');
    expect(META_SERVICE).toBe(FACEBOOK_SERVICE);
    expect(INSTAGRAM_SERVICE).toBe('Instagram');
    expect(probeMetaApp).toBe(probeFacebookApp);
    expect(metaConnector).toBe(facebookConnector);
  });

  it('builds a versioned URL on graph.facebook.com unless told another host', () => {
    expect(graphUrl('v21.0', '/me')).toBe('https://graph.facebook.com/v21.0/me');
    expect(graphUrl('v21.0', '/me', INSTAGRAM_GRAPH)).toBe('https://graph.instagram.com/v21.0/me');
  });
});

describe('graphGet', () => {
  it('GETs graph.facebook.com as Facebook with the token in the query', async () => {
    queue({ id: '1' });
    await expect(graphGet('v21.0', '/me', 'tok')).resolves.toEqual({ id: '1' });
    expect(serviceOf(0)).toBe('Facebook');
    expect(urlOf(0)).toBe(`${FACEBOOK_GRAPH}/v21.0/me?access_token=tok`);
    expect(initOf(0)).toBeUndefined();
  });

  it('GETs graph.instagram.com as Instagram when given that base', async () => {
    queue({ id: '2' });
    await graphGet('v21.0', '/me', 'tok', { fields: 'name' }, INSTAGRAM_GRAPH);
    expect(serviceOf(0)).toBe('Instagram');
    expect(urlOf(0)).toBe(`${INSTAGRAM_GRAPH}/v21.0/me?fields=name&access_token=tok`);
  });

  it('turns a Graph refusal into the words of the app whose token it was', async () => {
    mockFetch.mockResolvedValueOnce(reply({ error: { message: 'Invalid OAuth access token.', code: 190 } }, 400));
    await expect(graphGet('v21.0', '/me', 'dead', {}, INSTAGRAM_GRAPH)).rejects.toMatchObject({
      name: 'SocialApiError',
      message: 'Instagram: Invalid OAuth access token.',
      status: 400,
      expired: true,
    });
  });
});

describe('graphPost', () => {
  it('POSTs a form to graph.facebook.com with the token in the body', async () => {
    queue({ id: 'post_1' });
    await expect(graphPost('v21.0', '/123/feed', 'tok', { message: 'hi there' })).resolves.toEqual({ id: 'post_1' });
    expect(serviceOf(0)).toBe('Facebook');
    expect(urlOf(0)).toBe(`${FACEBOOK_GRAPH}/v21.0/123/feed`);
    expect(initOf(0)?.method).toBe('POST');
    expect(initOf(0)?.headers).toEqual({ 'content-type': 'application/x-www-form-urlencoded' });
    expect(formOf(0)).toEqual({ message: 'hi there', access_token: 'tok' });
  });

  it('POSTs to graph.instagram.com as Instagram when given that base', async () => {
    queue({ id: 'c1' });
    await graphPost('v21.0', '/9/media', 'tok', { image_url: 'https://cdn/a.jpg' }, INSTAGRAM_GRAPH);
    expect(serviceOf(0)).toBe('Instagram');
    expect(urlOf(0)).toBe(`${INSTAGRAM_GRAPH}/v21.0/9/media`);
    expect(formOf(0)).toEqual({ image_url: 'https://cdn/a.jpg', access_token: 'tok' });
  });
});

describe('graphTime', () => {
  it('reads a Graph stamp whose zone has no colon', () => {
    expect(graphTime('2026-09-20T10:15:00+0000').toISOString()).toBe('2026-09-20T10:15:00.000Z');
    expect(graphTime('2026-09-20T10:15:00-0530').toISOString()).toBe('2026-09-20T15:45:00.000Z');
  });

  it('is now when Graph sent no time', () => {
    const now = Date.UTC(2026, 9, 31, 12, 0, 0);
    jest.useFakeTimers({ now });
    try {
      expect(graphTime(undefined).getTime()).toBe(now);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('probeFacebookApp', () => {
  it('asks Facebook for an app token and names the app it belongs to', async () => {
    queue({ access_token: 'app|tok' }, { name: 'Duncit Social' });
    await expect(probeFacebookApp(CREDS)).resolves.toEqual({ ok: true, message: 'Facebook accepted the App ID and Secret (Duncit Social)' });
    expect(at(0)).toEqual({
      endpoint: `${FACEBOOK_GRAPH}/v21.0/oauth/access_token`,
      params: { client_id: 'app-1', client_secret: 'shh', grant_type: 'client_credentials' },
    });
    expect(at(1)).toEqual({ endpoint: `${FACEBOOK_GRAPH}/v21.0/app-1`, params: { fields: 'name', access_token: 'app|tok' } });
    expect(serviceOf(0)).toBe('Facebook');
  });

  it('accepts without a name when Graph sends none', async () => {
    queue({ access_token: 't' }, {});
    await expect(probeFacebookApp(CREDS)).resolves.toEqual({ ok: true, message: 'Facebook accepted the App ID and Secret' });
  });

  it("rejects with Facebook's reason when the pair is wrong, without a second call", async () => {
    mockFetch.mockResolvedValueOnce(reply({ error: { message: 'Error validating client secret.', code: 1 } }, 400));
    await expect(probeFacebookApp(CREDS)).resolves.toEqual({
      ok: false,
      message: 'Facebook rejected the App ID or Secret — Facebook: Error validating client secret.',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects with the failure's own text when it is not an Error", async () => {
    mockFetch.mockRejectedValueOnce('socket hang up');
    await expect(probeFacebookApp(CREDS)).resolves.toEqual({ ok: false, message: 'Facebook rejected the App ID or Secret — socket hang up' });
  });
});

describe('facebookConnector', () => {
  it('sends the person to the Facebook dialog asking for the Page scopes only', () => {
    const url = new URL(facebookConnector.authorizeUrl({ creds: CREDS, state: 'st-1', challenge: 'unused' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://www.facebook.com/v21.0/dialog/oauth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'app-1',
      redirect_uri: CREDS.redirectUri,
      state: 'st-1',
      response_type: 'code',
      scope: PAGE_SCOPES.join(','),
    });
    expect(url.searchParams.get('scope')).not.toMatch(/instagram/);
  });

  it('swaps the code for a short token, that for a long one, and lists the Pages with it', async () => {
    queue({ access_token: 'short' }, { access_token: 'long' }, { data: [] });
    await expect(facebookConnector.connect({ code: 'the-code', creds: CREDS, verifier: '' })).resolves.toEqual([]);
    expect(at(0)).toEqual({
      endpoint: `${FACEBOOK_GRAPH}/v21.0/oauth/access_token`,
      params: { client_id: 'app-1', client_secret: 'shh', redirect_uri: CREDS.redirectUri, code: 'the-code' },
    });
    expect(at(1)).toEqual({
      endpoint: `${FACEBOOK_GRAPH}/v21.0/oauth/access_token`,
      params: { grant_type: 'fb_exchange_token', client_id: 'app-1', client_secret: 'shh', fb_exchange_token: 'short' },
    });
    expect(at(2)).toEqual({
      endpoint: `${FACEBOOK_GRAPH}/v21.0/me/accounts`,
      params: { fields: 'id,name,username,link,access_token,followers_count,fan_count,picture{url}', limit: '100', access_token: 'long' },
    });
    expect(at(2).params.fields).not.toContain('instagram_business_account');
  });

  it('returns one FACEBOOK account per Page — never the Instagram account a Page is linked to', async () => {
    queue(
      { access_token: 'short' },
      { access_token: 'long' },
      {
        data: [
          {
            id: 'p1',
            name: 'Duncit',
            username: 'duncitpage',
            link: 'https://www.facebook.com/duncitpage',
            access_token: 'page-1',
            followers_count: 1200,
            fan_count: 900,
            picture: { data: { url: 'https://cdn/p1.jpg' } },
            instagram_business_account: { id: 'ig1', username: 'duncit', name: 'Duncit IG' },
          },
          { id: 'p2', username: 'second', access_token: 'page-2', fan_count: 7, picture: {} },
          { id: 'p3', access_token: 'page-3' },
        ],
      }
    );
    const found = await facebookConnector.connect({ code: 'c', creds: CREDS, verifier: '' });
    expect(found.map((a) => a.platform)).toEqual(['FACEBOOK', 'FACEBOOK', 'FACEBOOK']);
    expect(found[0]).toEqual({
      platform: 'FACEBOOK',
      external_id: 'p1',
      name: 'Duncit',
      handle: 'duncitpage',
      avatar_url: 'https://cdn/p1.jpg',
      profile_url: 'https://www.facebook.com/duncitpage',
      followers: 1200,
      tokens: { access_token: 'page-1', refresh_token: '', expires_at: null, scopes: PAGE_SCOPES },
      meta: {},
    });
    // No name falls back to the username, then to the id; no picture or link to blanks and the Page's address.
    expect(found[1]).toMatchObject({ external_id: 'p2', name: 'second', handle: 'second', avatar_url: '', followers: 7 });
    expect(found[2]).toMatchObject({
      external_id: 'p3',
      name: 'p3',
      handle: '',
      avatar_url: '',
      profile_url: 'https://www.facebook.com/p3',
      followers: 0,
      tokens: { access_token: 'page-3' },
    });
  });

  it('connects nothing when Graph lists no Pages at all', async () => {
    queue({ access_token: 'short' }, { access_token: 'long' }, {});
    await expect(facebookConnector.connect({ code: 'c', creds: CREDS, verifier: '' })).resolves.toEqual([]);
  });
});
