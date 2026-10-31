import { outboundFetch } from '@utils/outboundFetch';
import { probeThreadsApp, threadsConnector, threadsReader } from '../../providers/threads';
import { threadsPublisher } from '../../providers/threads.publish';
import type { PublishContent, SocialAccountHandle, SocialAppCredentials } from '../../social.types';

jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

/**
 * Every Threads call goes through `outboundFetch`, so each test lines up the
 * answers in the order the provider must ask for them, then checks the exact
 * URLs and form bodies it sent and what it made of the replies. The probe is
 * the one exception: it uses `fetch` itself (a timeout signal, no retries).
 */
const fetchMock = outboundFetch as jest.Mock;

type Call = [string, string, RequestInit | undefined];

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, headers: new Headers(), json: async () => body });
const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(reply(status, body));
const calls = (): Call[] => fetchMock.mock.calls as Call[];
const urlOf = (index: number) => new URL(calls()[index][1]);
const queryOf = (index: number) => Object.fromEntries(urlOf(index).searchParams);
const formOf = (index: number) => Object.fromEntries(new URLSearchParams(String(calls()[index][2]?.body)));

const SCOPES = ['threads_basic', 'threads_content_publish', 'threads_manage_replies', 'threads_read_replies', 'threads_manage_insights'];
const NOW = 1_780_000_000_000;
const SIXTY_DAYS = 5_184_000;

const creds: SocialAppCredentials = { clientId: 'app-1', clientSecret: 'shh', redirectUri: 'https://duncit.test/cb', version: 'v1.0' };
const account: SocialAccountHandle = {
  provider: 'THREADS',
  platform: 'THREADS',
  external_id: '77',
  handle: 'duncit',
  access_token: 'tok',
  refresh_token: '',
  meta: {},
};
const profile = { id: '77', username: 'duncit', name: 'Duncit', threads_profile_picture_url: 'https://cdn.test/p.jpg' };
const followers = (value: number) => ({ data: [{ name: 'followers_count', period: 'day', total_value: { value } }] });
const noPermission = { error: { message: 'Insufficient permission', type: 'OAuthException', code: 10 } };

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

// `clearMocks` only forgets calls; the timeout test installs a standing answer that must not outlive it.
afterEach(() => {
  fetchMock.mockReset();
});

describe('threadsConnector', () => {
  it('sends the person to threads.net with every scope, the state and a code response', () => {
    const url = new URL(threadsConnector.authorizeUrl({ creds, state: 'st-1', challenge: 'unused' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://threads.net/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'app-1',
      redirect_uri: 'https://duncit.test/cb',
      scope: SCOPES.join(','),
      response_type: 'code',
      state: 'st-1',
    });
  });

  it('swaps the code for a short token, that for a sixty-day one, then reads the profile and followers', async () => {
    answer({ access_token: 'short', user_id: 77 });
    answer({ access_token: 'long', token_type: 'bearer', expires_in: SIXTY_DAYS });
    answer(profile);
    answer(followers(1234));

    const accounts = await threadsConnector.connect({ code: 'code-1', creds, verifier: 'unused' });

    expect(calls()[0][0]).toBe('Threads');
    expect(calls()[0][1]).toBe('https://graph.threads.net/oauth/access_token');
    expect(calls()[0][2]?.method).toBe('POST');
    expect(formOf(0)).toEqual({
      client_id: 'app-1',
      client_secret: 'shh',
      grant_type: 'authorization_code',
      redirect_uri: 'https://duncit.test/cb',
      code: 'code-1',
    });
    expect(urlOf(1).pathname).toBe('/access_token');
    expect(queryOf(1)).toEqual({ grant_type: 'th_exchange_token', client_secret: 'shh', access_token: 'short' });
    expect(urlOf(2).pathname).toBe('/v1.0/me');
    expect(queryOf(2)).toEqual({ fields: 'id,username,name,threads_profile_picture_url', access_token: 'long' });
    expect(urlOf(3).pathname).toBe('/v1.0/77/threads_insights');
    expect(queryOf(3)).toEqual({ metric: 'followers_count', access_token: 'long' });
    expect(accounts).toEqual([
      {
        platform: 'THREADS',
        external_id: '77',
        name: 'Duncit',
        handle: 'duncit',
        avatar_url: 'https://cdn.test/p.jpg',
        profile_url: 'https://www.threads.net/@duncit',
        followers: 1234,
        tokens: { access_token: 'long', refresh_token: '', expires_at: new Date(NOW + SIXTY_DAYS * 1000), scopes: SCOPES },
        meta: {},
      },
    ]);
  });

  it('still connects, with 0 followers and bare fields, when insights are refused and the profile is sparse', async () => {
    answer({ access_token: 'short' });
    answer({ access_token: 'long' });
    answer({ id: '77', username: 'duncit' });
    answer(noPermission, 400);

    const [found] = await threadsConnector.connect({ code: 'code-1', creds, verifier: 'unused' });

    expect(found).toMatchObject({ external_id: '77', name: 'duncit', handle: 'duncit', avatar_url: '', followers: 0 });
    expect(found.tokens.expires_at).toBeNull();
  });

  it('leaves the profile link empty when Threads gives no username', async () => {
    answer({ access_token: 'short' });
    answer({ access_token: 'long' });
    answer({ id: '77' });
    answer(followers(5));

    const [found] = await threadsConnector.connect({ code: 'code-1', creds, verifier: 'unused' });

    expect(found).toMatchObject({ name: '', handle: '', profile_url: '', followers: 5 });
  });

  it('fails the connect when the code exchange itself is refused', async () => {
    answer({ error: { message: 'Invalid authorization code', code: 100 } }, 400);
    await expect(threadsConnector.connect({ code: 'bad', creds, verifier: 'unused' })).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 400,
      message: 'Threads: Invalid authorization code',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('threadsReader', () => {
  it('renews the long-lived token with itself and keeps no refresh token', async () => {
    answer({ access_token: 'renewed', token_type: 'bearer', expires_in: SIXTY_DAYS });
    const tokens = await threadsReader.refresh?.(account, creds);
    expect(urlOf(0).pathname).toBe('/refresh_access_token');
    expect(queryOf(0)).toEqual({ grant_type: 'th_refresh_token', access_token: 'tok' });
    expect(tokens).toEqual({ access_token: 'renewed', refresh_token: '', expires_at: new Date(NOW + SIXTY_DAYS * 1000), scopes: SCOPES });
  });

  it('reads the profile with the account token and its followers from insights', async () => {
    answer(profile);
    answer(followers(42));
    await expect(threadsReader.profile(account, creds)).resolves.toEqual({
      name: 'Duncit',
      handle: 'duncit',
      avatar_url: 'https://cdn.test/p.jpg',
      followers: 42,
    });
    expect(urlOf(0).pathname).toBe('/v1.0/me');
    expect(queryOf(0)).toEqual({ fields: 'id,username,name,threads_profile_picture_url', access_token: 'tok' });
    expect(urlOf(1).pathname).toBe('/v1.0/77/threads_insights');
  });

  it('falls back to the stored handle and 0 followers when the profile is sparse and insights refused', async () => {
    answer({ id: '77' });
    answer(noPermission, 403);
    await expect(threadsReader.profile(account, creds)).resolves.toEqual({ name: 'duncit', handle: 'duncit', avatar_url: '', followers: 0 });
  });

  it('lists posts and asks each one for its insights in turn, mapping counts and the video thumbnail', async () => {
    answer({
      data: [
        {
          id: 'p1',
          text: 'Hello',
          media_type: 'IMAGE',
          media_url: 'https://cdn.test/a.jpg',
          permalink: 'https://www.threads.net/@duncit/post/p1',
          timestamp: '2026-09-20T10:15:00+0000',
        },
        {
          id: 'p2',
          text: 'Clip',
          media_type: 'VIDEO',
          media_url: 'https://cdn.test/a.mp4',
          thumbnail_url: 'https://cdn.test/a-thumb.jpg',
          permalink: 'https://www.threads.net/@duncit/post/p2',
          timestamp: '2026-09-21T08:00:00+0000',
        },
        { id: 'p3' },
      ],
    });
    answer({
      data: [
        { name: 'views', period: 'lifetime', values: [{ value: 900 }] },
        { name: 'likes', total_value: { value: 12 } },
        { name: 'replies', total_value: { value: 3 } },
        { name: 'reposts', total_value: { value: 2 } },
        { name: 'quotes', total_value: { value: 1 } },
      ],
    });
    answer(noPermission, 400);
    answer({ data: [] });

    const posts = await threadsReader.posts(account, creds);

    expect(urlOf(0).pathname).toBe('/v1.0/77/threads');
    expect(queryOf(0)).toEqual({ fields: 'id,text,media_type,media_url,thumbnail_url,permalink,timestamp', limit: '50', access_token: 'tok' });
    expect(urlOf(1).pathname).toBe('/v1.0/p1/insights');
    expect(queryOf(1)).toEqual({ metric: 'views,likes,replies,reposts,quotes', access_token: 'tok' });
    expect(urlOf(2).pathname).toBe('/v1.0/p2/insights');
    expect(urlOf(3).pathname).toBe('/v1.0/p3/insights');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(posts).toEqual([
      {
        external_id: 'p1',
        text: 'Hello',
        media_url: 'https://cdn.test/a.jpg',
        permalink: 'https://www.threads.net/@duncit/post/p1',
        published_at: new Date('2026-09-20T10:15:00+00:00'),
        likes: 12,
        comments: 3,
        shares: 3,
        views: 900,
      },
      {
        external_id: 'p2',
        text: 'Clip',
        media_url: 'https://cdn.test/a-thumb.jpg',
        permalink: 'https://www.threads.net/@duncit/post/p2',
        published_at: new Date('2026-09-21T08:00:00+00:00'),
        likes: 0,
        comments: 0,
        shares: 0,
        views: null,
      },
      { external_id: 'p3', text: '', media_url: '', permalink: '', published_at: expect.any(Date), likes: 0, comments: 0, shares: 0, views: null },
    ]);
  });

  it('reads an empty timeline as no posts without asking for insights', async () => {
    answer({});
    await expect(threadsReader.posts(account, creds)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads a post’s replies with the author as both name and handle, falling back to the post link', async () => {
    const post = { external_id: 'p1', permalink: 'https://www.threads.net/@duncit/post/p1' };
    answer({
      data: [
        { id: 'r1', text: 'Nice', username: 'fan', timestamp: '2026-09-22T09:00:00+0000', permalink: 'https://www.threads.net/@fan/post/r1' },
        { id: 'r2' },
      ],
    });

    const comments = await threadsReader.comments(account, post, creds);

    expect(urlOf(0).pathname).toBe('/v1.0/p1/replies');
    expect(queryOf(0)).toEqual({ fields: 'id,text,username,timestamp,permalink', limit: '50', access_token: 'tok' });
    expect(comments).toEqual([
      {
        external_id: 'r1',
        author_name: 'fan',
        author_handle: 'fan',
        text: 'Nice',
        permalink: 'https://www.threads.net/@fan/post/r1',
        published_at: new Date('2026-09-22T09:00:00+00:00'),
        likes: 0,
      },
      { external_id: 'r2', author_name: '', author_handle: '', text: '', permalink: post.permalink, published_at: expect.any(Date), likes: 0 },
    ]);
  });

  it('lets a dead token surface as expired so the account is marked for reconnecting', async () => {
    answer({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400);
    await expect(threadsReader.comments(account, { external_id: 'p1', permalink: '' }, creds)).rejects.toMatchObject({ expired: true });
  });
});

describe('probeThreadsApp', () => {
  const realFetch = global.fetch;
  const probe = (status: number, body: unknown) => {
    const stub = jest.fn().mockResolvedValue(reply(status, body));
    global.fetch = stub;
    return stub;
  };

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts the keys with a code that cannot be real; a refused code means the keys were accepted', async () => {
    const stub = probe(400, { error: 'invalid_grant', error_description: 'Invalid authorization code' });
    await expect(probeThreadsApp(creds)).resolves.toEqual({ ok: true, message: 'Threads accepted the App ID and Secret' });
    const [url, init] = stub.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.threads.net/oauth/access_token');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/x-www-form-urlencoded' });
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      client_id: 'app-1',
      client_secret: 'shh',
      grant_type: 'authorization_code',
      redirect_uri: 'https://duncit.test/cb',
      code: 'duncit-connection-test',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is accepted outright on a 2xx', async () => {
    probe(200, { access_token: 'x' });
    await expect(probeThreadsApp(creds)).resolves.toEqual({ ok: true, message: 'Threads accepted the App ID and Secret' });
  });

  it.each([
    [401, 'anything at all'],
    [400, 'Invalid platform app'],
    [400, 'Invalid Client ID'],
    [400, 'The App Secret is wrong'],
  ])('rejects the keys on %i "%s"', async (status, error) => {
    probe(status, { error });
    await expect(probeThreadsApp(creds)).resolves.toEqual({ ok: false, message: `Threads rejected the App ID or Secret (${error})` });
  });

  it('does not blame the keys for a 400 that is about something else', async () => {
    probe(400, { error: 'invalid_request', error_description: 'Missing redirect_uri' });
    await expect(probeThreadsApp(creds)).resolves.toEqual({ ok: true, message: 'Threads accepted the App ID and Secret' });
  });
});

describe('threadsPublisher', () => {
  const text: PublishContent = { text: 'Hello', media_url: '', media_type: null };
  const permalink = 'https://www.threads.net/@duncit/post/post-1';
  const finish = () => {
    answer({ id: 'post-1' });
    answer({ permalink });
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('makes a TEXT container, polls every five seconds until FINISHED, publishes it and reads the permalink', async () => {
    answer({ id: 'c1' });
    answer({ status: 'IN_PROGRESS' });
    answer({ status: 'FINISHED' });
    finish();

    const attempt = threadsPublisher.publish(account, text, creds);
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(attempt).resolves.toEqual({ external_id: 'post-1', permalink });

    expect(calls()[0][1]).toBe('https://graph.threads.net/v1.0/77/threads');
    expect(calls()[0][2]?.method).toBe('POST');
    expect(formOf(0)).toEqual({ media_type: 'TEXT', text: 'Hello', access_token: 'tok' });
    for (const poll of [1, 2]) {
      expect(urlOf(poll).pathname).toBe('/v1.0/c1');
      expect(queryOf(poll)).toEqual({ fields: 'status,error_message', access_token: 'tok' });
    }
    expect(calls()[3][1]).toBe('https://graph.threads.net/v1.0/77/threads_publish');
    expect(formOf(3)).toEqual({ creation_id: 'c1', access_token: 'tok' });
    expect(urlOf(4).pathname).toBe('/v1.0/post-1');
    expect(queryOf(4)).toEqual({ fields: 'permalink', access_token: 'tok' });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('does not wait at all when the container is FINISHED on the first look, and no media URL means a TEXT post', async () => {
    answer({ id: 'c1' });
    answer({ status: 'FINISHED' });
    finish();
    const result = threadsPublisher.publish(account, { text: 'Hello', media_url: '', media_type: 'IMAGE' }, creds);
    await expect(result).resolves.toEqual({ external_id: 'post-1', permalink });
    expect(formOf(0)).toEqual({ media_type: 'TEXT', text: 'Hello', access_token: 'tok' });
    expect(jest.getTimerCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('makes an IMAGE container from the JPEG rendition of an uploaded picture', async () => {
    answer({ id: 'c2' });
    answer({ status: 'FINISHED' });
    finish();
    await threadsPublisher.publish(account, { text: 'Pic', media_url: 'https://ik.imagekit.io/duncit/a.png', media_type: 'IMAGE' }, creds);
    expect(formOf(0)).toEqual({ media_type: 'IMAGE', image_url: 'https://ik.imagekit.io/duncit/a.png?tr=f-jpg', text: 'Pic', access_token: 'tok' });
  });

  it('makes a VIDEO container from the untouched original of an uploaded clip', async () => {
    answer({ id: 'c3' });
    answer({ status: 'FINISHED' });
    answer({ id: 'post-3' });
    answer({});
    const result = await threadsPublisher.publish(account, { text: '', media_url: 'https://ik.imagekit.io/duncit/a.mp4', media_type: 'VIDEO' }, creds);
    expect(formOf(0)).toEqual({ media_type: 'VIDEO', video_url: 'https://ik.imagekit.io/duncit/a.mp4?tr=orig-true', text: '', access_token: 'tok' });
    expect(result).toEqual({ external_id: 'post-3', permalink: '' });
  });

  it.each([
    ['ERROR', 'Unsupported media', 'Threads: Threads could not process the post (Unsupported media)'],
    ['EXPIRED', undefined, 'Threads: Threads could not process the post (EXPIRED)'],
  ])('gives up with 422 when the container ends %s', async (status, error_message, message) => {
    answer({ id: 'c1' });
    answer({ status, error_message });
    await expect(threadsPublisher.publish(account, text, creds)).rejects.toMatchObject({ name: 'SocialApiError', status: 422, message });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up with 504 after sixty polls, five seconds apart, that never finish', async () => {
    answer({ id: 'c1' });
    fetchMock.mockResolvedValue(reply(200, { status: 'IN_PROGRESS' }));

    const attempt = threadsPublisher.publish(account, text, creds);
    const outcome = expect(attempt).rejects.toMatchObject({
      status: 504,
      message: 'Threads: Threads was still processing the post after five minutes',
    });
    await jest.advanceTimersByTimeAsync(59 * 5_000);
    expect(fetchMock).toHaveBeenCalledTimes(61);
    await jest.advanceTimersByTimeAsync(5_000);
    await outcome;
    expect(fetchMock).toHaveBeenCalledTimes(61);
  });
});
