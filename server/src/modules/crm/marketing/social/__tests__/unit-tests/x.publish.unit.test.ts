/**
 * Posting to X with the account's user token: each picture downloaded and
 * uploaded as bytes, then one post naming them by id — up to the four X
 * allows. The outbound fetch is faked; every URL, header, body and mapped
 * value is asserted.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { X_API } from '../../providers/x';
import { xPublisher } from '../../providers/x.publish';
import { publishContent } from '../../social.rules';
import type { PublishMedia, SocialAccountHandle } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;

const CREDS = { clientId: 'x-app', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: '' };
const IMAGES = ['a', 'b', 'c', 'd'].map((name) => `https://ik.imagekit.io/duncit/posts/${name}.png`);
const BYTES = new Uint8Array([1, 2, 3]);

const user: SocialAccountHandle = {
  provider: 'X',
  platform: 'X',
  external_id: '42',
  handle: 'duncit',
  access_token: 'x-tok',
  refresh_token: 'x-refresh',
  meta: {},
};

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  arrayBuffer: async () => BYTES.buffer,
  headers: new Headers(headers),
});
const answer = (body: unknown, status = 200, headers: Record<string, string> = {}) => mockFetch.mockResolvedValueOnce(reply(body, status, headers));

/** The two answers one picture takes: its bytes from the CDN, then X's media id. */
const uploadRound = (id: string) => {
  answer({}, 200, { 'content-type': 'image/png', 'content-length': '3' });
  answer({ data: { id } });
};

const picture = (index: number): PublishMedia => ({ url: IMAGES[index], type: 'IMAGE' });

const serviceOf = (call: number): string => mockFetch.mock.calls[call][0];
const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): RequestInit | undefined => mockFetch.mock.calls[call][2];
const jsonOf = (call: number) => JSON.parse(String(initOf(call)?.body));

beforeEach(() => mockFetch.mockReset());

describe('xPublisher', () => {
  it('posts text alone with the bearer token, and links the post under the handle', async () => {
    answer({ data: { id: '1700', text: 'Hello pets' } });
    const out = await xPublisher.publish(user, publishContent('Hello pets', []), CREDS);
    expect(out).toEqual({ external_id: '1700', permalink: 'https://x.com/duncit/status/1700' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(serviceOf(0)).toBe('X');
    expect(urlOf(0)).toBe(`${X_API}/tweets`);
    expect(initOf(0)?.method).toBe('POST');
    expect(initOf(0)?.headers).toEqual({ Authorization: 'Bearer x-tok', 'content-type': 'application/json' });
    expect(jsonOf(0)).toEqual({ text: 'Hello pets' });
  });

  it('links under "i" for an account whose handle is unknown, and reports no id when X sends none', async () => {
    answer({ data: { id: '1701' } });
    await expect(xPublisher.publish({ ...user, handle: '' }, publishContent('x', []), CREDS)).resolves.toEqual({
      external_id: '1701',
      permalink: 'https://x.com/i/status/1701',
    });
    answer({});
    await expect(xPublisher.publish(user, publishContent('x', []), CREDS)).resolves.toEqual({ external_id: '', permalink: '' });
  });

  it('downloads one picture, uploads its bytes as a form, and names it on the post', async () => {
    uploadRound('m-1');
    answer({ data: { id: '1702' } });
    const out = await xPublisher.publish(user, publishContent('Look', [picture(0)]), CREDS);
    expect(out.external_id).toBe('1702');
    expect(mockFetch).toHaveBeenCalledTimes(3);

    expect(serviceOf(0)).toBe('X');
    expect(urlOf(0)).toBe(IMAGES[0]);
    expect(initOf(0)).toBeUndefined();

    expect(urlOf(1)).toBe(`${X_API}/media/upload`);
    expect(initOf(1)?.method).toBe('POST');
    expect(initOf(1)?.headers).toEqual({ Authorization: 'Bearer x-tok' });
    const form = initOf(1)?.body;
    expect(form).toBeInstanceOf(FormData);
    const sent = form as FormData;
    expect(sent.get('media_category')).toBe('tweet_image');
    const file = sent.get('media');
    expect(file).toBeInstanceOf(Blob);
    expect((file as Blob).type).toBe('image/png');
    expect((file as Blob).size).toBe(3);

    expect(urlOf(2)).toBe(`${X_API}/tweets`);
    expect(jsonOf(2)).toEqual({ text: 'Look', media: { media_ids: ['m-1'] } });
  });

  it('uploads up to four pictures in order and names them all on the post', async () => {
    uploadRound('m-1');
    uploadRound('m-2');
    uploadRound('m-3');
    uploadRound('m-4');
    answer({ data: { id: '1703' } });
    const out = await xPublisher.publish(user, publishContent('Four looks', [picture(0), picture(1), picture(2), picture(3)]), CREDS);
    expect(out).toEqual({ external_id: '1703', permalink: 'https://x.com/duncit/status/1703' });
    expect(mockFetch).toHaveBeenCalledTimes(9);
    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      IMAGES[0],
      `${X_API}/media/upload`,
      IMAGES[1],
      `${X_API}/media/upload`,
      IMAGES[2],
      `${X_API}/media/upload`,
      IMAGES[3],
      `${X_API}/media/upload`,
      `${X_API}/tweets`,
    ]);
    expect(jsonOf(8)).toEqual({ text: 'Four looks', media: { media_ids: ['m-1', 'm-2', 'm-3', 'm-4'] } });
  });

  it('stops at the first picture the CDN will not serve, posting nothing', async () => {
    uploadRound('m-1');
    answer({}, 404);
    await expect(xPublisher.publish(user, publishContent('Two looks', [picture(0), picture(1)]), CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 404,
      expired: false,
      message: 'X: could not read the image (HTTP 404)',
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls.some((call) => call[1] === `${X_API}/tweets`)).toBe(false);
  });

  it('refuses a picture larger than 20 MB without reading it', async () => {
    answer({}, 200, { 'content-type': 'image/png', 'content-length': String(21 * 1024 * 1024) });
    await expect(xPublisher.publish(user, publishContent('Big', [picture(0)]), CREDS)).rejects.toMatchObject({
      status: 413,
      message: 'X: the image is larger than 20 MB',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('reads a refused upload token as expired', async () => {
    answer({}, 200, { 'content-type': 'image/png' });
    answer({ title: 'Unauthorized', detail: 'Unauthorized' }, 401);
    await expect(xPublisher.publish(user, publishContent('Look', [picture(0)]), CREDS)).rejects.toMatchObject({
      status: 401,
      expired: true,
      message: 'X: Unauthorized',
    });
  });
});
