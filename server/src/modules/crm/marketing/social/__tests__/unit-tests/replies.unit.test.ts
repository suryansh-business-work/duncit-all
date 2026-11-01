/**
 * Answering a comment on each network that this integration may answer on:
 * every URL, header and body the repliers send is asserted against a faked
 * outbound fetch, and so is the id each one hands back. Facebook has no
 * replier at all — its app does not ask for `pages_manage_engagement`.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { REPLIERS } from '../../providers/replies';
import type { SocialAccountHandle, SocialPlatform, SocialProvider, SocialReplier } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;
const CREDS = { clientId: 'app', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v21.0' };

const handle = (platform: SocialPlatform, provider: SocialProvider = platform): SocialAccountHandle => ({
  provider,
  platform,
  external_id: 'acct-1',
  handle: 'duncit',
  access_token: `${platform.toLowerCase()}-tok`,
  refresh_token: '',
  meta: {},
});

const answer = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(headers),
  });

const call = (index: number) => {
  const [service, url, init] = mockFetch.mock.calls[index] as [string, string, RequestInit];
  return { service, url, init, headers: (init.headers ?? {}) as Record<string, string> };
};
const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)));
const json = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>;

/** A replier that must exist for the platform under test. */
const replierOf = (platform: SocialPlatform): SocialReplier => {
  const replier = REPLIERS[platform];
  if (!replier) throw new Error(`${platform} has no replier`);
  return replier;
};

const TARGET = { comment_id: 'c-9', post_id: 'p-3' };

beforeEach(() => mockFetch.mockReset());

describe('REPLIERS', () => {
  it('has no replier for Facebook, and one for every other network', () => {
    expect(REPLIERS.FACEBOOK).toBeNull();
    for (const platform of ['INSTAGRAM', 'THREADS', 'YOUTUBE', 'LINKEDIN', 'X'] as const) expect(REPLIERS[platform]).not.toBeNull();
  });
});

describe('Instagram', () => {
  it('posts the reply under the comment on graph.instagram.com for an Instagram Login token', async () => {
    answer({ id: 'ig-reply-1' });
    await expect(replierOf('INSTAGRAM').reply(handle('INSTAGRAM'), TARGET, 'Thanks, Asha!', CREDS)).resolves.toEqual({ external_id: 'ig-reply-1' });
    const { service, url, init } = call(0);
    expect(service).toBe('Instagram');
    expect(url).toBe('https://graph.instagram.com/v21.0/c-9/replies');
    expect(init.method).toBe('POST');
    expect(form(init)).toEqual({ message: 'Thanks, Asha!', access_token: 'instagram-tok' });
  });

  it('says what Instagram refused', async () => {
    answer({ error: { message: 'Unsupported post request', code: 100 } }, 400);
    await expect(replierOf('INSTAGRAM').reply(handle('INSTAGRAM'), TARGET, 'Hi', CREDS)).rejects.toMatchObject({
      message: 'Instagram: Unsupported post request',
      status: 400,
      expired: false,
    });
  });
});

describe('Threads', () => {
  it('makes a text container that replies to the comment, then publishes it', async () => {
    answer({ id: 'container-1' });
    answer({ id: 'th-reply-1' });
    await expect(replierOf('THREADS').reply(handle('THREADS'), TARGET, 'See you Sunday', CREDS)).resolves.toEqual({ external_id: 'th-reply-1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const made = call(0);
    expect(made.url).toBe('https://graph.threads.net/v21.0/acct-1/threads');
    expect(form(made.init)).toEqual({ media_type: 'TEXT', text: 'See you Sunday', reply_to_id: 'c-9', access_token: 'threads-tok' });
    const published = call(1);
    expect(published.url).toBe('https://graph.threads.net/v21.0/acct-1/threads_publish');
    expect(form(published.init)).toEqual({ creation_id: 'container-1', access_token: 'threads-tok' });
  });
});

describe('YouTube', () => {
  it('inserts a comment whose parent is the top-level comment', async () => {
    answer({ id: 'yt-reply-1' });
    await expect(replierOf('YOUTUBE').reply(handle('YOUTUBE'), TARGET, 'Glad you liked it', CREDS)).resolves.toEqual({ external_id: 'yt-reply-1' });
    const { service, url, init, headers } = call(0);
    expect(service).toBe('YouTube');
    expect(url).toBe('https://www.googleapis.com/youtube/v3/comments?part=snippet');
    expect(headers).toMatchObject({ Authorization: 'Bearer youtube-tok', 'content-type': 'application/json' });
    expect(json(init)).toEqual({ snippet: { parentId: 'c-9', textOriginal: 'Glad you liked it' } });
  });

  it('hands back an empty id when YouTube names none', async () => {
    answer({});
    await expect(replierOf('YOUTUBE').reply(handle('YOUTUBE'), TARGET, 'Hi', CREDS)).resolves.toEqual({ external_id: '' });
  });
});

describe('LinkedIn', () => {
  const COMMENT = 'urn:li:comment:(urn:li:activity:7,8)';
  const POST = 'urn:li:share:7';

  it('comments as the Page under the comment, naming it by the URN LinkedIn sends back', async () => {
    answer({}, 201, { 'x-restli-id': 'urn:li:comment:(urn:li:activity:7,9)' });
    const result = await replierOf('LINKEDIN').reply(handle('LINKEDIN'), { comment_id: COMMENT, post_id: POST }, 'Thank you!', { ...CREDS, version: '202510' });
    expect(result).toEqual({ external_id: 'urn:li:comment:(urn:li:activity:7,9)' });
    const { url, init, headers } = call(0);
    expect(url).toBe(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(COMMENT)}/comments`);
    expect(headers).toMatchObject({ Authorization: 'Bearer linkedin-tok', 'LinkedIn-Version': '202510', 'X-Restli-Protocol-Version': '2.0.0' });
    expect(json(init)).toEqual({ actor: 'urn:li:organization:acct-1', object: POST, parentComment: COMMENT, message: { text: 'Thank you!' } });
  });

  it.each([
    [{ $URN: 'urn:li:comment:a' }, 'urn:li:comment:a'],
    [{ id: '42' }, '42'],
    [{}, ''],
  ])('falls back to the body when there is no header (%j)', async (body, expected) => {
    answer(body, 201);
    const result = await replierOf('LINKEDIN').reply(handle('LINKEDIN'), { comment_id: COMMENT, post_id: POST }, 'Hi', CREDS);
    expect(result).toEqual({ external_id: expected });
  });
});

describe('X', () => {
  it('posts in reply to the reply', async () => {
    answer({ data: { id: '1999' } }, 201);
    await expect(replierOf('X').reply(handle('X'), TARGET, 'On it!', CREDS)).resolves.toEqual({ external_id: '1999' });
    const { service, url, init, headers } = call(0);
    expect(service).toBe('X');
    expect(url).toBe('https://api.x.com/2/tweets');
    expect(headers).toMatchObject({ Authorization: 'Bearer x-tok' });
    expect(json(init)).toEqual({ text: 'On it!', reply: { in_reply_to_tweet_id: 'c-9' } });
  });

  it('marks a refused token as expired', async () => {
    answer({ title: 'Unauthorized' }, 401);
    await expect(replierOf('X').reply(handle('X'), TARGET, 'Hi', CREDS)).rejects.toMatchObject({ expired: true, status: 401 });
  });

  it('hands back an empty id when X names none', async () => {
    answer({});
    await expect(replierOf('X').reply(handle('X'), TARGET, 'Hi', CREDS)).resolves.toEqual({ external_id: '' });
  });
});
