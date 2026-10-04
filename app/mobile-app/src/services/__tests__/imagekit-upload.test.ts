import { Platform } from 'react-native';
import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const file = { uri: 'file://a.png', name: 'a.png', type: 'image/png' };

// The single-use upload pass: the file goes to OUR server, which holds the
// private key and forwards it to ImageKit — no client-side signature.
const AUTH = {
  uploadUrl: 'https://api.test/upload/imagekit',
  ticket: 'tkt/1',
  urlEndpoint: 'https://ik.io/x',
};

let lastXhr: FakeXhr | null = null;

class FakeXhr {
  method = '';
  url = '';
  status = 200;
  responseText = '';
  upload: {
    onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  } = {
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

/** Waits until the auth round-trip resolves and xhr.send() has run. */
const flushToSend = async () => {
  for (let i = 0; i < 10 && !lastXhr; i++) {
    await Promise.resolve();
  }
  expect(lastXhr).not.toBeNull();
  return lastXhr!;
};

const realXhr = global.XMLHttpRequest;

beforeEach(() => {
  jest.clearAllMocks();
  lastXhr = null;
  (global as any).XMLHttpRequest = FakeXhr;
  mockRequest.mockResolvedValue({ getImagekitAuth: AUTH });
});

afterEach(() => {
  (global as any).XMLHttpRequest = realXhr;
  jest.restoreAllMocks();
});

describe('uploadToImagekitDirect', () => {
  it('fetches signed auth then POSTs the file multipart with real progress', async () => {
    const onProgress = jest.fn();
    const pending = uploadToImagekitDirect(file, '/support', onProgress);
    const xhr = await flushToSend();

    // The pass is fetched via the authenticated GraphQL mutation, scoped to the
    // folder and attributed to the app surface.
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { folder: '/support', surface: 'MOBILE' },
      { auth: true },
    );
    // The file bytes are POSTed multipart to the pass's upload URL, carrying the
    // URL-encoded ticket and file name.
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://api.test/upload/imagekit?ticket=tkt%2F1&fileName=a.png');
    expect(xhr.sentBody).toBeInstanceOf(FormData);

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ url: 'https://ik.io/out.png' });
    xhr.onload?.();

    await expect(pending).resolves.toBe('https://ik.io/out.png');
    expect(onProgress).toHaveBeenCalledWith(25);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('on web, materialises the picked URI into a real File before appending', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    const blob = new Blob(['reel-bytes'], { type: 'video/mp4' });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ blob: jest.fn().mockResolvedValue(blob) } as unknown as Response);

    try {
      const pending = uploadToImagekitDirect(file, '/pods/reels');
      const xhr = await flushToSend();
      // The picked URI is read back into bytes before the multipart POST.
      expect(fetchMock).toHaveBeenCalledWith(file.uri);
      xhr.responseText = JSON.stringify({ url: 'https://ik.io/out.mp4' });
      xhr.onload?.();
      await expect(pending).resolves.toBe('https://ik.io/out.mp4');
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('throws the ImageKit error message when the response is not ok', async () => {
    const pending = uploadToImagekitDirect(file, '/support');
    const xhr = await flushToSend();
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ message: 'file too large' });
    xhr.onload?.();
    await expect(pending).rejects.toThrow('file too large');
  });

  it('falls back to "Upload failed" when the error body has no message', async () => {
    const pending = uploadToImagekitDirect(file, '/support');
    const xhr = await flushToSend();
    xhr.status = 500;
    xhr.responseText = JSON.stringify(null);
    xhr.onload?.();
    await expect(pending).rejects.toThrow('Upload failed');
  });

  it('falls back to "Upload failed" when the response body cannot be parsed', async () => {
    const pending = uploadToImagekitDirect(file, '/support');
    const xhr = await flushToSend();
    xhr.status = 502;
    xhr.responseText = '<html>bad gateway</html>';
    xhr.onload?.();
    await expect(pending).rejects.toThrow('Upload failed');
  });

  it('rejects with "Upload failed" on a network error', async () => {
    const pending = uploadToImagekitDirect(file, '/support');
    const xhr = await flushToSend();
    xhr.onerror?.();
    await expect(pending).rejects.toThrow('Upload failed');
  });
});
