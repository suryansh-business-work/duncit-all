/**
 * Posting to a Facebook Page: text to the feed, one photo or one video
 * through its own edge, and two or more photos as unpublished uploads that
 * one feed post then carries. The outbound fetch is faked; every URL, form
 * body and mapped id is asserted.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { facebookPublisher } from '../../providers/facebook.publish';
import { FACEBOOK_GRAPH } from '../../providers/meta';
import { publishContent } from '../../social.rules';
import type { SocialAccountHandle } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;

const CREDS = { clientId: 'fb-app', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v21.0' };
const IMAGE = 'https://ik.imagekit.io/duncit/posts/a.png';
const IMAGE_2 = 'https://ik.imagekit.io/duncit/posts/b.png';
const IMAGE_3 = 'https://ik.imagekit.io/duncit/posts/c.png';
const VIDEO = 'https://ik.imagekit.io/duncit/posts/clip.mp4';

const page: SocialAccountHandle = {
  provider: 'FACEBOOK',
  platform: 'FACEBOOK',
  external_id: '555',
  handle: 'duncitpage',
  access_token: 'page-tok',
  refresh_token: '',
  meta: {},
};

const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: new Headers(),
});
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};

const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): RequestInit | undefined => mockFetch.mock.calls[call][2];
const formOf = (call: number) => Object.fromEntries(new URLSearchParams(String(initOf(call)?.body)));

beforeEach(() => mockFetch.mockReset());

describe('facebookPublisher', () => {
  it('posts text alone to the feed', async () => {
    queue({ id: '555_100' });
    await expect(facebookPublisher.publish(page, publishContent('Hello pets', []), CREDS)).resolves.toEqual({
      external_id: '555_100',
      permalink: 'https://www.facebook.com/555_100',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('Facebook');
    expect(urlOf(0)).toBe(`${FACEBOOK_GRAPH}/v21.0/555/feed`);
    expect(initOf(0)?.method).toBe('POST');
    expect(formOf(0)).toEqual({ message: 'Hello pets', access_token: 'page-tok' });
  });

  it('posts one picture through the photos edge, published at once, and names the post it made', async () => {
    queue({ id: 'photo-1', post_id: '555_200' });
    const out = await facebookPublisher.publish(page, publishContent('Look', [{ url: IMAGE, type: 'IMAGE' }]), CREDS);
    expect(out).toEqual({ external_id: '555_200', permalink: 'https://www.facebook.com/555_200' });
    expect(urlOf(0)).toBe(`${FACEBOOK_GRAPH}/v21.0/555/photos`);
    expect(formOf(0)).toEqual({ url: IMAGE, caption: 'Look', published: 'true', access_token: 'page-tok' });
  });

  it('falls back to the photo id when Graph names no post', async () => {
    queue({ id: 'photo-1' });
    await expect(facebookPublisher.publish(page, publishContent('', [{ url: IMAGE, type: 'IMAGE' }]), CREDS)).resolves.toEqual({
      external_id: 'photo-1',
      permalink: 'https://www.facebook.com/photo-1',
    });
  });

  it('posts one video through the videos edge from the untouched original', async () => {
    queue({ id: 'vid-1' });
    const out = await facebookPublisher.publish(page, publishContent('Clip', [{ url: VIDEO, type: 'VIDEO' }]), CREDS);
    expect(out).toEqual({ external_id: 'vid-1', permalink: 'https://www.facebook.com/555/videos/vid-1' });
    expect(urlOf(0)).toBe(`${FACEBOOK_GRAPH}/v21.0/555/videos`);
    expect(formOf(0)).toEqual({ file_url: `${VIDEO}?tr=orig-true`, description: 'Clip', access_token: 'page-tok' });
  });

  it('uploads two or more pictures unpublished, then one feed post that carries them all', async () => {
    queue({ id: 'ph-1' }, { id: 'ph-2' }, { id: 'ph-3' }, { id: '555_300' });
    const album = publishContent('Three looks', [
      { url: IMAGE, type: 'IMAGE' },
      { url: IMAGE_2, type: 'IMAGE' },
      { url: IMAGE_3, type: 'IMAGE' },
    ]);
    const out = await facebookPublisher.publish(page, album, CREDS);
    expect(out).toEqual({ external_id: '555_300', permalink: 'https://www.facebook.com/555_300' });
    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      `${FACEBOOK_GRAPH}/v21.0/555/photos`,
      `${FACEBOOK_GRAPH}/v21.0/555/photos`,
      `${FACEBOOK_GRAPH}/v21.0/555/photos`,
      `${FACEBOOK_GRAPH}/v21.0/555/feed`,
    ]);
    // No caption on the pictures: the text belongs to the one post that shows them.
    expect(formOf(0)).toEqual({ url: IMAGE, published: 'false', access_token: 'page-tok' });
    expect(formOf(1)).toEqual({ url: IMAGE_2, published: 'false', access_token: 'page-tok' });
    expect(formOf(2)).toEqual({ url: IMAGE_3, published: 'false', access_token: 'page-tok' });
    expect(formOf(3)).toEqual({
      message: 'Three looks',
      'attached_media[0]': '{"media_fbid":"ph-1"}',
      'attached_media[1]': '{"media_fbid":"ph-2"}',
      'attached_media[2]': '{"media_fbid":"ph-3"}',
      access_token: 'page-tok',
    });
  });

  it('stops a multi-photo post at the first picture Graph refuses, making no feed post', async () => {
    queue({ id: 'ph-1' });
    mockFetch.mockResolvedValueOnce(reply({ error: { message: 'Invalid image URL', code: 324 } }, 400));
    const album = publishContent('Two looks', [
      { url: IMAGE, type: 'IMAGE' },
      { url: IMAGE_2, type: 'IMAGE' },
    ]);
    await expect(facebookPublisher.publish(page, album, CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 400,
      expired: false,
      message: 'Facebook: Invalid image URL',
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('surfaces a dead Page token as expired', async () => {
    mockFetch.mockResolvedValueOnce(reply({ error: { message: 'Error validating access token', code: 190 } }, 400));
    await expect(facebookPublisher.publish(page, publishContent('Hello', []), CREDS)).rejects.toMatchObject({ expired: true });
  });
});
