/**
 * Posting as a LinkedIn Page through the Posts API: the little-text
 * escaping, the register → download → upload round each picture takes, one
 * picture as the post's media and several as its multiImage, and the post's
 * URN read from the response header. The outbound fetch is faked; every
 * URL, header, body and mapped value is asserted.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { LINKEDIN_API } from '../../providers/linkedin';
import { linkedinPublisher, littleText } from '../../providers/linkedin.publish';
import { publishContent } from '../../social.rules';
import type { SocialAccountHandle } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;

const CREDS = { clientId: 'li-app', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: '202410' };
const IMAGE = 'https://ik.imagekit.io/duncit/posts/a.png';
const IMAGE_2 = 'https://ik.imagekit.io/duncit/posts/b.png';
const IMAGE_3 = 'https://ik.imagekit.io/duncit/posts/c.png';
const BYTES = new Uint8Array([1, 2, 3]);

const org: SocialAccountHandle = {
  provider: 'LINKEDIN',
  platform: 'LINKEDIN',
  external_id: '9001',
  handle: 'duncit',
  access_token: 'li-tok',
  refresh_token: 'li-refresh',
  meta: {},
};

const HEADERS = { Authorization: 'Bearer li-tok', 'LinkedIn-Version': '202410', 'X-Restli-Protocol-Version': '2.0.0' };

/** A fetch Response stand-in: JSON back, bytes for a download, and headers where LinkedIn answers in them. */
const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  arrayBuffer: async () => BYTES.buffer,
  headers: new Headers(headers),
});
const answer = (body: unknown, status = 200, headers: Record<string, string> = {}) => mockFetch.mockResolvedValueOnce(reply(body, status, headers));

/** The three answers one picture's upload takes: the upload address, the picture's bytes, the PUT's ok. */
const uploadRound = (n: number) => {
  answer({ value: { uploadUrl: `https://upload.linkedin.test/${n}`, image: `urn:li:image:${n}` } });
  answer({}, 200, { 'content-type': 'image/png', 'content-length': '3' });
  answer({}, 201);
};

const serviceOf = (call: number): string => mockFetch.mock.calls[call][0];
const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): RequestInit | undefined => mockFetch.mock.calls[call][2];
const jsonOf = (call: number) => JSON.parse(String(initOf(call)?.body));

beforeEach(() => mockFetch.mockReset());

describe('littleText', () => {
  it('escapes the characters LinkedIn reads as markup and writes a hashtag as its template', () => {
    expect(littleText('Hello (pets) #DogDays & more_fun')).toBe(String.raw`Hello \(pets\) {hashtag|\#|DogDays} & more\_fun`);
    expect(littleText('plain')).toBe('plain');
  });
});

describe('linkedinPublisher', () => {
  const basePost = {
    author: 'urn:li:organization:9001',
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  it('posts text alone as the Page, and names the post by the URN in the response header', async () => {
    answer({}, 201, { 'x-restli-id': 'urn:li:share:77' });
    const out = await linkedinPublisher.publish(org, publishContent('Hello #Pets', []), CREDS);
    expect(out).toEqual({ external_id: 'urn:li:share:77', permalink: 'https://www.linkedin.com/feed/update/urn:li:share:77' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(serviceOf(0)).toBe('LinkedIn');
    expect(urlOf(0)).toBe(`${LINKEDIN_API}/posts`);
    expect(initOf(0)?.method).toBe('POST');
    expect(initOf(0)?.headers).toEqual({ ...HEADERS, 'content-type': 'application/json' });
    expect(jsonOf(0)).toEqual({ ...basePost, commentary: String.raw`Hello {hashtag|\#|Pets}` });
  });

  it('reports no id when LinkedIn sends no URN back', async () => {
    answer({});
    await expect(linkedinPublisher.publish(org, publishContent('x', []), CREDS)).resolves.toEqual({ external_id: '', permalink: '' });
  });

  it('registers, downloads and uploads one picture, then posts it as the media', async () => {
    uploadRound(1);
    answer({}, 201, { 'x-restli-id': 'urn:li:share:78' });
    const out = await linkedinPublisher.publish(org, publishContent('Look', [{ url: IMAGE, type: 'IMAGE' }]), CREDS);
    expect(out.external_id).toBe('urn:li:share:78');
    expect(mockFetch).toHaveBeenCalledTimes(4);

    expect(urlOf(0)).toBe(`${LINKEDIN_API}/images?action=initializeUpload`);
    expect(initOf(0)?.headers).toEqual({ ...HEADERS, 'content-type': 'application/json' });
    expect(jsonOf(0)).toEqual({ initializeUploadRequest: { owner: 'urn:li:organization:9001' } });

    expect(serviceOf(1)).toBe('LinkedIn');
    expect(urlOf(1)).toBe(IMAGE);
    expect(initOf(1)).toBeUndefined();

    expect(urlOf(2)).toBe('https://upload.linkedin.test/1');
    expect(initOf(2)?.method).toBe('PUT');
    expect(initOf(2)?.headers).toEqual({ Authorization: 'Bearer li-tok', 'content-type': 'image/png' });
    expect(initOf(2)?.body).toBe(BYTES.buffer);

    expect(urlOf(3)).toBe(`${LINKEDIN_API}/posts`);
    expect(jsonOf(3)).toEqual({ ...basePost, commentary: 'Look', content: { media: { id: 'urn:li:image:1' } } });
  });

  it('uploads two or more pictures in order and posts them as a multiImage', async () => {
    uploadRound(1);
    uploadRound(2);
    uploadRound(3);
    answer({}, 201, { 'x-restli-id': 'urn:li:share:79' });
    const album = publishContent('Three looks', [
      { url: IMAGE, type: 'IMAGE' },
      { url: IMAGE_2, type: 'IMAGE' },
      { url: IMAGE_3, type: 'IMAGE' },
    ]);
    const out = await linkedinPublisher.publish(org, album, CREDS);
    expect(out).toEqual({ external_id: 'urn:li:share:79', permalink: 'https://www.linkedin.com/feed/update/urn:li:share:79' });
    expect(mockFetch).toHaveBeenCalledTimes(10);
    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      `${LINKEDIN_API}/images?action=initializeUpload`,
      IMAGE,
      'https://upload.linkedin.test/1',
      `${LINKEDIN_API}/images?action=initializeUpload`,
      IMAGE_2,
      'https://upload.linkedin.test/2',
      `${LINKEDIN_API}/images?action=initializeUpload`,
      IMAGE_3,
      'https://upload.linkedin.test/3',
      `${LINKEDIN_API}/posts`,
    ]);
    expect(jsonOf(9)).toEqual({
      ...basePost,
      commentary: 'Three looks',
      content: { multiImage: { images: [{ id: 'urn:li:image:1' }, { id: 'urn:li:image:2' }, { id: 'urn:li:image:3' }] } },
    });
  });

  it('gives up when LinkedIn hands back no upload address, before downloading anything', async () => {
    answer({ value: {} });
    await expect(linkedinPublisher.publish(org, publishContent('Look', [{ url: IMAGE, type: 'IMAGE' }]), CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 502,
      expired: false,
      message: 'LinkedIn: LinkedIn did not return an upload address',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('stops a multi-picture post at the first upload that fails, and reads a 401 there as an expired token', async () => {
    uploadRound(1);
    answer({ value: { uploadUrl: 'https://upload.linkedin.test/2', image: 'urn:li:image:2' } });
    answer({}, 200, { 'content-type': 'image/png' });
    answer({}, 401);
    const album = publishContent('Two looks', [
      { url: IMAGE, type: 'IMAGE' },
      { url: IMAGE_2, type: 'IMAGE' },
    ]);
    await expect(linkedinPublisher.publish(org, album, CREDS)).rejects.toMatchObject({
      name: 'SocialApiError',
      status: 401,
      expired: true,
      message: 'LinkedIn: image upload failed (HTTP 401)',
    });
    expect(mockFetch).toHaveBeenCalledTimes(6);
    expect(mockFetch.mock.calls.some((call) => call[1] === `${LINKEDIN_API}/posts`)).toBe(false);
  });

  it('refuses a picture the CDN will not serve', async () => {
    answer({ value: { uploadUrl: 'https://upload.linkedin.test/1', image: 'urn:li:image:1' } });
    answer({}, 404);
    await expect(linkedinPublisher.publish(org, publishContent('Look', [{ url: IMAGE, type: 'IMAGE' }]), CREDS)).rejects.toMatchObject({
      status: 404,
      message: 'LinkedIn: could not read the image (HTTP 404)',
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
