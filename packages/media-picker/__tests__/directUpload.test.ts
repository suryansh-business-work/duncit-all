import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { directUploadToImagekit } from '../src/useImagekitDirectUpload';

// A pass to OUR upload route, not an ImageKit signature: the browser cannot
// make one, and the signed-from-the-browser scheme fails outright when the
// account's two keys are not a pair.
const AUTH = {
  uploadUrl: 'https://server.test/upload',
  ticket: 'tkt-1',
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
  it('fetches a pass, POSTs the file to our server and reports real progress', async () => {
    const client = makeClient();
    const onProgress = vi.fn();
    const pending = directUploadToImagekit(client, file, '/pods/reels', onProgress);
    await waitForSend();

    const xhr = lastXhr!;
    expect(xhr.method).toBe('POST');
    // Our server, with the single-use pass and the name on the query string.
    expect(xhr.url).toContain('https://server.test/upload');
    expect(xhr.url).toContain('ticket=tkt-1');
    expect(xhr.url).toContain('fileName=reel.mp4');
    expect(xhr.sentBody).toBeInstanceOf(FormData);
    const form = xhr.sentBody as FormData;
    const sent = form.get('file') as File;
    expect(sent.name).toBe('reel.mp4');
    expect(sent.size).toBe(file.size);
    // The folder rides on the pass, not the upload — a ticket for one folder
    // cannot be spent writing into another.
    expect(form.get('folder')).toBeNull();
    expect(form.get('signature')).toBeNull();

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    // A transport that under-reports `total` walks the ratio past 1 — the bar
    // read "137%" before this was clamped. A zero total would divide to NaN.
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 274, total: 200 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 0 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ url: 'https://ik.io/out.mp4' });
    xhr.onload?.();

    await expect(pending).resolves.toBe('https://ik.io/out.mp4');
    expect(onProgress).toHaveBeenCalledWith(25);
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(onProgress).toHaveBeenCalledTimes(2);
    // Nothing above 100, and nothing that is not a number.
    for (const [pct] of onProgress.mock.calls) {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
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
    await expect(pending).rejects.toThrow('no file URL came back');
  });
});
