import { afterEach, describe, expect, it, vi } from 'vitest';
import { envEntryService } from '../../services/envEntry.service';
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB, isImageMime, probeImagekit, uploadImage } from '../../services/upload.service';
import { apiError } from '../helpers/expect';

const json = (body: unknown, status = 200, statusText = '') => new Response(JSON.stringify(body), { status, statusText, headers: { 'content-type': 'application/json' } });
const basic = (key: string) => `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isImageMime', () => {
  it('accepts the picture formats covers and avatars use', () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'IMAGE/PNG']) expect(isImageMime(mime)).toBe(true);
  });

  it('refuses everything else, including SVG', () => {
    for (const mime of ['image/svg+xml', 'application/pdf', 'text/html', '', 'image/png; charset=binary']) expect(isImageMime(mime)).toBe(false);
  });

  it('allows up to 10 MB', () => {
    expect(UPLOAD_MAX_MB).toBe(10);
    expect(UPLOAD_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('uploadImage', () => {
  it('is refused with CONFIG_ERROR while ImageKit is not configured', async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(uploadImage(png, 'cover.png')).rejects.toMatchObject(apiError('CONFIG_ERROR', 'Image uploads are not configured yet (Console → Environment → ImageKit).'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uploads over Basic auth with the private key into the configured folder', async () => {
    const active = vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ private_key: 'private_abc', folder: '/lite/covers' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ url: 'https://ik.imagekit.io/duncit/lite/covers/cover_x1.png', fileId: 'file-1' }));

    await expect(uploadImage(png, 'cover.png')).resolves.toEqual({ url: 'https://ik.imagekit.io/duncit/lite/covers/cover_x1.png', fileId: 'file-1' });

    expect(active).toHaveBeenCalledWith('IMAGEKIT');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://upload.imagekit.io/api/v1/files/upload');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ Authorization: basic('private_abc') });
    const form = init?.body;
    if (!(form instanceof FormData)) throw new Error('expected a multipart body');
    expect(form.get('fileName')).toBe('cover.png');
    expect(form.get('folder')).toBe('/lite/covers');
    expect(form.get('useUniqueFileName')).toBe('true');
    const file = form.get('file');
    if (!(file instanceof Blob)) throw new Error('expected the file part');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(png);
  });

  it("uses Lite's own folder when none is configured, and a key handed in by the caller", async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ url: 'https://ik.imagekit.io/x.png' }));
    await expect(uploadImage(png, 'avatar.png', 'private_override')).resolves.toEqual({ url: 'https://ik.imagekit.io/x.png', fileId: '' });
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.headers).toEqual({ Authorization: basic('private_override') });
    const form = init?.body;
    if (!(form instanceof FormData)) throw new Error('expected a multipart body');
    expect(form.get('folder')).toBe('/lite');
  });

  it("reports ImageKit's reason as UPSTREAM_ERROR", async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ private_key: 'private_abc' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'Your account cannot be authenticated.' }, 401));
    await expect(uploadImage(png, 'cover.png')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'ImageKit upload failed: Your account cannot be authenticated.'));
  });

  it('treats an answer without a URL as a failure, naming the HTTP status text', async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ private_key: 'private_abc' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 200, 'OK'));
    await expect(uploadImage(png, 'cover.png')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'ImageKit upload failed: OK'));
  });

  it('survives a non-JSON error page', async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ private_key: 'private_abc' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>502</html>', { status: 502, statusText: 'Bad Gateway' }));
    await expect(uploadImage(png, 'cover.png')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'ImageKit upload failed: Bad Gateway'));
  });
});

describe('probeImagekit', () => {
  it('needs a private key', async () => {
    await expect(probeImagekit('')).resolves.toEqual({ ok: false, message: 'Private key is required' });
  });

  it('lists one file with the key to prove it, without uploading', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));
    await expect(probeImagekit('private_abc')).resolves.toEqual({ ok: true, message: 'ImageKit credentials are valid' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://api.imagekit.io/v1/files?limit=1');
    expect(init?.headers).toEqual({ Authorization: basic('private_abc') });
  });

  it('reports a rejected key with its status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'Forbidden' }, 403));
    await expect(probeImagekit('private_wrong')).resolves.toEqual({ ok: false, message: 'ImageKit rejected the key (HTTP 403)' });
  });
});
