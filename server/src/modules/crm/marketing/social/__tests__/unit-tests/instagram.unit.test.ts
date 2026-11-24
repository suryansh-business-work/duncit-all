/**
 * Instagram accounts: token renewal for the ones from the retired Instagram
 * Login, and the reader and publisher — on graph.instagram.com for those, on
 * graph.facebook.com for one connected through Facebook Login (Unified login,
 * or the Facebook app before it), whose token only that host honours. The
 * connect itself is meta.login.unit.test.ts. The outbound fetch is faked and
 * the clock is frozen; every host, URL, body and mapped value is asserted.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import type { SocialAccountHandle } from '../../social.types';
import { SocialApiError } from '../../providers/http';
import { INSTAGRAM_SCOPES, INSTAGRAM_SERVICE, graphBase, instagramReader, usesFacebookGraph } from '../../providers/instagram';
import { instagramPublisher } from '../../providers/instagram.publish';
import { FACEBOOK_GRAPH, INSTAGRAM_GRAPH } from '../../providers/meta';
import { publishContent } from '../../social.rules';

const mockFetch = outboundFetch as jest.Mock;

const CREDS = { clientId: 'ig-app', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v21.0' };
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const SIXTY_DAYS_S = 5_184_000;

const account = (provider: 'INSTAGRAM' | 'FACEBOOK', meta: Record<string, string> = {}): SocialAccountHandle => ({
  provider,
  platform: 'INSTAGRAM',
  external_id: '1784140',
  handle: 'duncit',
  access_token: `${provider.toLowerCase()}-tok`,
  refresh_token: '',
  meta,
});
/** Connected through Instagram Login: an Instagram user token. */
const viaInstagram = account('INSTAGRAM');
/** Connected through Facebook before Instagram had its own app: a Page token. */
const viaFacebook = account('FACEBOOK');
/** Connected through Facebook Login for Business from the Instagram button: the Page token, provider INSTAGRAM. */
const viaUnified = account('INSTAGRAM', { login: 'FACEBOOK', page_id: 'p1' });

const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: new Headers(),
});
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};

const serviceOf = (call: number): string => mockFetch.mock.calls[call][0];
const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): RequestInit | undefined => mockFetch.mock.calls[call][2];
const at = (call: number) => {
  const url = new URL(urlOf(call));
  return { endpoint: `${url.origin}${url.pathname}`, params: Object.fromEntries(url.searchParams) };
};
const formOf = (call: number) => Object.fromEntries(new URLSearchParams(String(initOf(call)?.body)));

/** A promise's outcome, caught before any timer is advanced so a rejection is never unhandled. */
const settle = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error })
  );

/** The reader's renewal — the interface makes it optional, Instagram's has one. */
const refresh = (acct: SocialAccountHandle) => {
  if (!instagramReader.refresh) throw new Error('instagramReader has no refresh');
  return instagramReader.refresh(acct, CREDS);
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockFetch.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('graphBase', () => {
  it('reads a Facebook Login token through graph.facebook.com and an Instagram Login token through graph.instagram.com', () => {
    expect(graphBase(viaFacebook)).toBe(FACEBOOK_GRAPH);
    expect(graphBase(viaUnified)).toBe(FACEBOOK_GRAPH);
    expect(graphBase(viaInstagram)).toBe(INSTAGRAM_GRAPH);
    expect(usesFacebookGraph({ provider: 'INSTAGRAM', meta: null })).toBe(false);
    expect(usesFacebookGraph({ provider: 'INSTAGRAM', meta: { login: 'INSTAGRAM' } })).toBe(false);
    expect(INSTAGRAM_SERVICE).toBe('Instagram');
  });
});

describe('instagramReader.refresh', () => {
  it('renews a token from Instagram Login on graph.instagram.com for another sixty days', async () => {
    queue({ access_token: 'long-2', token_type: 'bearer', expires_in: SIXTY_DAYS_S });
    await expect(refresh(viaInstagram)).resolves.toEqual({
      access_token: 'long-2',
      refresh_token: '',
      expires_at: new Date(NOW + SIXTY_DAYS_S * 1000),
      scopes: INSTAGRAM_SCOPES,
    });
    expect(serviceOf(0)).toBe('Instagram');
    expect(at(0)).toEqual({
      endpoint: `${INSTAGRAM_GRAPH}/refresh_access_token`,
      params: { grant_type: 'ig_refresh_token', access_token: 'instagram-tok' },
    });
  });

  it.each([['the old Facebook app', viaFacebook], ['Unified login', viaUnified]])('cannot renew a token from %s — a person must reconnect', async (_via, acct) => {
    const outcome = await settle(refresh(acct));
    expect(outcome).toHaveProperty('error');
    const error = (outcome as { error: unknown }).error;
    expect(error).toBeInstanceOf(SocialApiError);
    expect(error).toMatchObject({ status: 401, expired: true, message: 'Instagram: the Facebook Login token has expired — reconnect this account' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

/** How each account is connected, the host that answers for it, and where its profile lives there. */
const HOSTS: Array<[string, SocialAccountHandle, string, string]> = [
  ['Instagram Login', viaInstagram, INSTAGRAM_GRAPH, '/me'],
  ['Facebook', viaFacebook, FACEBOOK_GRAPH, '/1784140'],
  ['Unified login', viaUnified, FACEBOOK_GRAPH, '/1784140'],
];

describe.each(HOSTS)('instagramReader for an account connected through %s', (_via, acct, host, profilePath) => {
  it('reads the profile from the host that honours its token', async () => {
    queue({ username: 'duncit', name: 'Duncit', profile_picture_url: 'https://cdn/a.jpg', followers_count: 42 });
    await expect(instagramReader.profile(acct, CREDS)).resolves.toEqual({
      name: 'Duncit',
      handle: 'duncit',
      avatar_url: 'https://cdn/a.jpg',
      followers: 42,
    });
    expect(at(0)).toEqual({
      endpoint: `${host}/v21.0${profilePath}`,
      params: { fields: 'username,name,profile_picture_url,followers_count', access_token: acct.access_token },
    });
  });

  it('reads the latest media from that host', async () => {
    queue({ data: [] });
    await expect(instagramReader.posts(acct, CREDS)).resolves.toEqual([]);
    expect(at(0)).toEqual({
      endpoint: `${host}/v21.0/1784140/media`,
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: '50',
        access_token: acct.access_token,
      },
    });
  });

  it("reads a post's comments from that host", async () => {
    queue({ data: [] });
    await expect(instagramReader.comments(acct, { external_id: 'm-1', permalink: 'https://www.instagram.com/p/m1/' }, CREDS)).resolves.toEqual([]);
    expect(at(0)).toEqual({
      endpoint: `${host}/v21.0/m-1/comments`,
      params: { fields: 'id,text,username,timestamp,like_count', limit: '50', access_token: acct.access_token },
    });
  });
});

describe('instagramReader mapping', () => {
  it('falls back to the stored handle when the profile names nothing', async () => {
    queue({});
    await expect(instagramReader.profile(viaInstagram, CREDS)).resolves.toEqual({ name: 'duncit', handle: 'duncit', avatar_url: '', followers: 0 });
  });

  it("shows a video by its thumbnail and an image by itself, and copes with Graph's gaps", async () => {
    queue({
      data: [
        {
          id: 'v1',
          caption: 'Reel day',
          media_type: 'VIDEO',
          media_url: 'https://cdn/reel.mp4',
          thumbnail_url: 'https://cdn/reel.jpg',
          permalink: 'https://www.instagram.com/reel/v1/',
          timestamp: '2026-10-30T09:00:00+0000',
          like_count: 12,
          comments_count: 3,
        },
        { id: 'i1', media_type: 'IMAGE', media_url: 'https://cdn/photo.jpg', timestamp: '2026-10-29T09:00:00+0000' },
        { id: 'v2', media_type: 'VIDEO', media_url: 'https://cdn/reel2.mp4' },
        { id: 'bare' },
      ],
    });
    const posts = await instagramReader.posts(viaInstagram, CREDS);
    expect(posts[0]).toEqual({
      external_id: 'v1',
      text: 'Reel day',
      media_url: 'https://cdn/reel.jpg',
      permalink: 'https://www.instagram.com/reel/v1/',
      published_at: new Date('2026-10-30T09:00:00Z'),
      likes: 12,
      comments: 3,
      shares: 0,
      views: null,
    });
    expect(posts[1]).toMatchObject({ external_id: 'i1', media_url: 'https://cdn/photo.jpg', published_at: new Date('2026-10-29T09:00:00Z') });
    expect(posts[2].media_url).toBe('');
    expect(posts[3]).toEqual({
      external_id: 'bare',
      text: '',
      media_url: '',
      permalink: '',
      published_at: new Date(NOW),
      likes: 0,
      comments: 0,
      shares: 0,
      views: null,
    });
  });

  it('lists nothing when Graph sends no media list', async () => {
    queue({});
    await expect(instagramReader.posts(viaFacebook, CREDS)).resolves.toEqual([]);
  });

  it("maps a comment onto the post's permalink, blank where Graph is silent", async () => {
    queue({
      data: [
        { id: 'c1', text: 'Love it', username: 'fan', timestamp: '2026-10-30T10:00:00+0000', like_count: 2 },
        { id: 'c2' },
      ],
    });
    const post = { external_id: 'v1', permalink: 'https://www.instagram.com/reel/v1/' };
    await expect(instagramReader.comments(viaInstagram, post, CREDS)).resolves.toEqual([
      {
        external_id: 'c1',
        author_name: 'fan',
        author_handle: 'fan',
        text: 'Love it',
        permalink: post.permalink,
        published_at: new Date('2026-10-30T10:00:00Z'),
        likes: 2,
      },
      { external_id: 'c2', author_name: '', author_handle: '', text: '', permalink: post.permalink, published_at: new Date(NOW), likes: 0 },
    ]);
  });

  it('lists nothing when Graph sends no comment list', async () => {
    queue({});
    await expect(instagramReader.comments(viaFacebook, { external_id: 'v1', permalink: '' }, CREDS)).resolves.toEqual([]);
  });
});

describe('instagramPublisher', () => {
  const IMAGE = 'https://ik.imagekit.io/duncit/posts/a.png';
  const IMAGE_2 = 'https://ik.imagekit.io/duncit/posts/b.png';
  const VIDEO = 'https://ik.imagekit.io/duncit/posts/reel.mp4';
  const PERMALINK = 'https://www.instagram.com/p/abc/';
  const image = (text: string) => publishContent(text, [{ url: IMAGE, type: 'IMAGE' }]);
  const video = (text: string) => publishContent(text, [{ url: VIDEO, type: 'VIDEO' }]);
  const carousel = publishContent('Three looks', [
    { url: IMAGE, type: 'IMAGE' },
    { url: VIDEO, type: 'VIDEO' },
    { url: IMAGE_2, type: 'IMAGE' },
  ]);

  /** Route each Graph call by its path; the container's status comes from `states`, in order, the last one repeating. */
  const arrange = (states: Array<Record<string, string>>, post: Record<string, string> = { permalink: PERMALINK }) => {
    let polled = 0;
    mockFetch.mockImplementation(async (_service: string, url: string) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/media')) return reply({ id: 'container-1' });
      if (pathname.endsWith('/container-1')) return reply(states[Math.min(polled++, states.length - 1)]);
      if (pathname.endsWith('/media_publish')) return reply({ id: 'media-9' });
      return reply(post);
    });
  };
  const polls = () => mockFetch.mock.calls.filter((call) => new URL(call[1]).pathname.endsWith('/container-1')).length;
  const paths = () => mockFetch.mock.calls.map((call) => new URL(call[1]).pathname);

  /** Containers numbered in the order they are made; each one's state comes from `stateOf` its number. */
  const arrangeMany = (stateOf: (container: number) => Record<string, string>) => {
    let made = 0;
    mockFetch.mockImplementation(async (_service: string, url: string) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/media')) return reply({ id: `c-${++made}` });
      const container = /\/c-(\d+)$/.exec(pathname);
      if (container) return reply(stateOf(Number(container[1])));
      if (pathname.endsWith('/media_publish')) return reply({ id: 'media-9' });
      return reply({ permalink: PERMALINK });
    });
    return () => made;
  };

  it('publishes an image through graph.instagram.com for an account from Instagram Login', async () => {
    arrange([{ status_code: 'FINISHED' }]);
    const out = await instagramPublisher.publish(viaInstagram, image('Hello'), CREDS);
    expect(out).toEqual({ external_id: 'media-9', permalink: PERMALINK });
    expect(at(0).endpoint).toBe(`${INSTAGRAM_GRAPH}/v21.0/1784140/media`);
    expect(initOf(0)?.method).toBe('POST');
    // The CDN delivers the stored image as a JPEG, the only format Instagram takes.
    expect(formOf(0)).toEqual({ image_url: `${IMAGE}?tr=f-jpg`, caption: 'Hello', access_token: 'instagram-tok' });
    expect(at(1)).toEqual({ endpoint: `${INSTAGRAM_GRAPH}/v21.0/container-1`, params: { fields: 'status_code,status', access_token: 'instagram-tok' } });
    expect(at(2).endpoint).toBe(`${INSTAGRAM_GRAPH}/v21.0/1784140/media_publish`);
    expect(formOf(2)).toEqual({ creation_id: 'container-1', access_token: 'instagram-tok' });
    expect(at(3)).toEqual({ endpoint: `${INSTAGRAM_GRAPH}/v21.0/media-9`, params: { fields: 'permalink', access_token: 'instagram-tok' } });
    expect(mockFetch.mock.calls.map((call) => call[0])).toEqual(['Instagram', 'Instagram', 'Instagram', 'Instagram']);
  });

  it('publishes a Reel through graph.facebook.com for an account connected through Facebook, waiting out the transcode', async () => {
    arrange([{ status_code: 'IN_PROGRESS' }, { status_code: 'FINISHED' }]);
    const pending = settle(instagramPublisher.publish(viaFacebook, video('Reel'), CREDS));
    await jest.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ value: { external_id: 'media-9', permalink: PERMALINK } });
    // The stored file untouched: a re-encode on delivery is metered and buys nothing.
    expect(formOf(0)).toEqual({ media_type: 'REELS', video_url: `${VIDEO}?tr=orig-true`, caption: 'Reel', access_token: 'facebook-tok' });
    expect(polls()).toBe(2);
    expect(mockFetch.mock.calls.map((call) => new URL(call[1]).origin)).toEqual(Array(5).fill(FACEBOOK_GRAPH));
    expect(mockFetch.mock.calls.map((call) => call[0])).toEqual(Array(5).fill('Facebook'));
  });

  it('publishes two or more pieces as a carousel: one container each, then the carousel naming them', async () => {
    const made = arrangeMany(() => ({ status_code: 'FINISHED' }));
    const out = await instagramPublisher.publish(viaInstagram, carousel, CREDS);
    expect(out).toEqual({ external_id: 'media-9', permalink: PERMALINK });
    expect(paths()).toEqual([
      '/v21.0/1784140/media',
      '/v21.0/c-1',
      '/v21.0/1784140/media',
      '/v21.0/c-2',
      '/v21.0/1784140/media',
      '/v21.0/c-3',
      '/v21.0/1784140/media',
      '/v21.0/c-4',
      '/v21.0/1784140/media_publish',
      '/v21.0/media-9',
    ]);
    // Each child is marked a carousel item and carries no caption; a video inside is a VIDEO, not a Reel.
    expect(formOf(0)).toEqual({ image_url: `${IMAGE}?tr=f-jpg`, is_carousel_item: 'true', access_token: 'instagram-tok' });
    expect(formOf(2)).toEqual({ media_type: 'VIDEO', video_url: `${VIDEO}?tr=orig-true`, is_carousel_item: 'true', access_token: 'instagram-tok' });
    expect(formOf(4)).toEqual({ image_url: `${IMAGE_2}?tr=f-jpg`, is_carousel_item: 'true', access_token: 'instagram-tok' });
    expect(formOf(6)).toEqual({ media_type: 'CAROUSEL', children: 'c-1,c-2,c-3', caption: 'Three looks', access_token: 'instagram-tok' });
    expect(formOf(8)).toEqual({ creation_id: 'c-4', access_token: 'instagram-tok' });
    expect(at(9)).toEqual({ endpoint: `${INSTAGRAM_GRAPH}/v21.0/media-9`, params: { fields: 'permalink', access_token: 'instagram-tok' } });
    expect(made()).toBe(4);
    expect(mockFetch.mock.calls.map((call) => new URL(call[1]).origin)).toEqual(Array(10).fill(INSTAGRAM_GRAPH));
  });

  it('waits out each piece of a carousel in turn before making the next', async () => {
    // The second piece is still transcoding on its first look, ready five seconds later.
    let polled = 0;
    const made = arrangeMany((container) => (container === 2 && polled++ === 0 ? { status_code: 'IN_PROGRESS' } : { status_code: 'FINISHED' }));
    const pending = settle(instagramPublisher.publish(viaInstagram, carousel, CREDS));
    await jest.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ value: { external_id: 'media-9', permalink: PERMALINK } });
    // The third container is only asked for once the second is ready.
    expect(paths()).toEqual([
      '/v21.0/1784140/media',
      '/v21.0/c-1',
      '/v21.0/1784140/media',
      '/v21.0/c-2',
      '/v21.0/c-2',
      '/v21.0/1784140/media',
      '/v21.0/c-3',
      '/v21.0/1784140/media',
      '/v21.0/c-4',
      '/v21.0/1784140/media_publish',
      '/v21.0/media-9',
    ]);
    expect(made()).toBe(4);
  });

  it('stops a carousel at the first piece Instagram cannot process, making nothing after it', async () => {
    const made = arrangeMany((container): Record<string, string> =>
      container === 2 ? { status_code: 'ERROR', status: 'Video too long' } : { status_code: 'FINISHED' }
    );
    await expect(instagramPublisher.publish(viaInstagram, carousel, CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 422,
      message: 'Instagram: Instagram could not process the media (Video too long)',
    });
    expect(made()).toBe(2);
    expect(paths().some((path) => path.endsWith('/media_publish'))).toBe(false);
  });

  it("gives up with Instagram's own words when the media fails, without publishing", async () => {
    arrange([{ status_code: 'ERROR', status: 'Media upload failed: unsupported format' }]);
    await expect(instagramPublisher.publish(viaInstagram, image(''), CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 422,
      expired: false,
      message: 'Instagram: Instagram could not process the media (Media upload failed: unsupported format)',
    });
    expect(mockFetch.mock.calls.some((call) => new URL(call[1]).pathname.endsWith('/media_publish'))).toBe(false);
  });

  it('names the state when an expired container comes with no words', async () => {
    arrange([{ status_code: 'EXPIRED' }]);
    await expect(instagramPublisher.publish(viaInstagram, image(''), CREDS)).rejects.toMatchObject({
      status: 422,
      message: 'Instagram: Instagram could not process the media (EXPIRED)',
    });
  });

  it('stops after five minutes of polling', async () => {
    arrange([{ status_code: 'IN_PROGRESS' }]);
    const pending = settle(instagramPublisher.publish(viaInstagram, video(''), CREDS));
    await jest.advanceTimersByTimeAsync(60 * 5_000 + 1);
    const outcome = await pending;
    expect(outcome).toHaveProperty('error');
    expect((outcome as { error: unknown }).error).toMatchObject({
      name: 'SocialApiError',
      status: 504,
      expired: false,
      message: 'Instagram: Instagram was still processing the media after five minutes',
    });
    expect(polls()).toBe(60);
  });

  it('reports no permalink when Graph sends none', async () => {
    arrange([{ status_code: 'FINISHED' }], {});
    await expect(instagramPublisher.publish(viaInstagram, image('x'), CREDS)).resolves.toEqual({
      external_id: 'media-9',
      permalink: '',
    });
  });
});
