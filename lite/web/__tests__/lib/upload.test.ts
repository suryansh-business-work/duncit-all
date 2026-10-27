import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../shared/env';
import { uploadImage } from '../../lib/upload';

const fetchMock = vi.fn<typeof fetch>();
const picture = () => new File(['png-bytes'], 'cover.png', { type: 'image/png' });
const answer = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The request uploadImage sent. */
const sent = () => {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  return { url, init: init ?? {} };
};

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('uploadImage', () => {
  it('posts the picture as the multipart `file` field with the session token and answers the hosted URL', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 'tok-1');
    fetchMock.mockResolvedValue(answer(200, { url: 'https://ik.example/cover.png' }));
    const file = picture();

    await expect(uploadImage(file)).resolves.toBe('https://ik.example/cover.png');

    const { url, init } = sent();
    expect(url).toBe('/upload');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer tok-1' });
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body instanceof FormData ? init.body.get('file') : null).toBe(file);
  });

  it('sends no Authorization header when signed out', async () => {
    fetchMock.mockResolvedValue(answer(200, { url: 'https://ik.example/cover.png' }));
    await uploadImage(picture());
    expect(sent().init.headers).toEqual({});
  });

  it("throws the API's own reason when it refuses the picture", async () => {
    fetchMock.mockResolvedValue(answer(413, { error: 'Pictures must be under 5 MB' }));
    await expect(uploadImage(picture())).rejects.toThrow('Pictures must be under 5 MB');
  });

  it('throws the status when the refusal carries no readable body', async () => {
    fetchMock.mockResolvedValue(answer(502, '<html>Bad gateway</html>'));
    await expect(uploadImage(picture())).rejects.toThrow('Upload failed (502)');
  });

  it('treats an OK answer without a URL as a failure', async () => {
    fetchMock.mockResolvedValue(answer(200, {}));
    await expect(uploadImage(picture())).rejects.toThrow('Upload failed (200)');
  });

  it('lets a network failure reach the caller', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadImage(picture())).rejects.toThrow('Failed to fetch');
  });
});
