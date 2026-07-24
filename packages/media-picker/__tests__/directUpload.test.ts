import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { directUploadToImagekit } from '../src/useImagekitDirectUpload';

const AUTH = {
  token: 'tok',
  expire: 123,
  signature: 'sig',
  publicKey: 'pub',
  urlEndpoint: 'https://ik.io/x',
};

let lastXhr: FakeXhr | null = null;

class FakeXhr {
  method = '';
  url = '';
  status = 200;
  responseText = '';
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentBody: unknown = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: unknown) {
    this.sentBody = body;
    lastXhr = this;
  }
}

const makeClient = (data: unknown = { getImagekitAuth: AUTH }) =>
  ({ mutate: vi.fn().mockResolvedValue({ data }) }) as any;

const file = new File(['reel-bytes'], 'reel.mp4', { type: 'video/mp4' });

const waitForSend = () => vi.waitFor(() => expect(lastXhr).not.toBeNull());

beforeEach(() => {
  lastXhr = null;
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('directUploadToImagekit', () => {
  it('fetches signed auth, POSTs the multipart form and reports real progress', async () => {
    const client = makeClient();
    const onProgress = vi.fn();
    const pending = directUploadToImagekit(client, file, '/pods/reels', onProgress);
    await waitForSend();

    const xhr = lastXhr!;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toContain('upload.imagekit.io');
    expect(xhr.sentBody).toBeInstanceOf(FormData);
    const form = xhr.sentBody as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('folder')).toBe('/pods/reels');
    expect(form.get('signature')).toBe('sig');
    expect(form.get('expire')).toBe('123');

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ url: 'https://ik.io/out.mp4' });
    xhr.onload?.();

    await expect(pending).resolves.toBe('https://ik.io/out.mp4');
    expect(onProgress).toHaveBeenCalledWith(25);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('rejects with the ImageKit error message on a non-2xx response', async () => {
    const pending = directUploadToImagekit(makeClient(), file, '/pods/reels');
    await waitForSend();
    const xhr = lastXhr!;
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ message: 'Your request contains invalid signature parameter.' });
    xhr.onload?.();
    await expect(pending).rejects.toThrow('invalid signature');
  });

  it('falls back to "Upload failed" on a non-JSON error body and on network error', async () => {
    const pending = directUploadToImagekit(makeClient(), file, '/pods/reels');
    await waitForSend();
    const xhr = lastXhr!;
    xhr.status = 502;
    xhr.responseText = '<html>bad gateway</html>';
    xhr.onload?.();
    await expect(pending).rejects.toThrow('Upload failed');

    lastXhr = null;
    const pending2 = directUploadToImagekit(makeClient(), file, '/pods/reels');
    await waitForSend();
    lastXhr!.onerror?.();
    await expect(pending2).rejects.toThrow('Upload failed');
  });

  it('throws when the server returns no auth payload', async () => {
    await expect(directUploadToImagekit(makeClient(null), file, '/x')).rejects.toThrow(
      'Upload is not available right now',
    );
  });

  it('rejects a non-Blob file part instead of sending "[object Object]"', async () => {
    await expect(
      directUploadToImagekit(makeClient(), { name: 'x' } as unknown as File, '/x'),
    ).rejects.toThrow('a real file (Blob) is required');
  });

  it('rejects a 2xx response that carries no file URL', async () => {
    const pending = directUploadToImagekit(makeClient(), file, '/pods/reels');
    await waitForSend();
    const xhr = lastXhr!;
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ fileId: 'f1' });
    xhr.onload?.();
    await expect(pending).rejects.toThrow('returned no file URL');
  });
});
