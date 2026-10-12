import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { releaseBundle, uploadBundle } from '../../googlePlay.gateway';

jest.mock('@utils/googleServiceAccount', () => ({
  serviceAccountToken: jest.fn(async () => 'access-token'),
}));

const PART = 8 * 1024 * 1024;
const SIZE = PART + 1024; // two parts: one full, one of 1 KiB
const SESSION = 'https://upload.example.test/session-1';

let dir: string;
let aab: string;
let emptyAab: string;
let fetchMock: jest.Mock;

const answer = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(status === 308 ? null : JSON.stringify(body), { status, headers });

/** undici's shape for a dropped connection: a bare "fetch failed" with the reason on `cause`. */
const dropped = (code: string) =>
  Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('socket hang up'), { code }) });

const callOf = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit & { headers: Record<string, string> }];
  return { url, method: init.method, headers: init.headers, body: init.body as Buffer | undefined };
};

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'play-upload-'));
  aab = path.join(dir, 'app.aab');
  emptyAab = path.join(dir, 'empty.aab');
  writeFileSync(aab, Buffer.alloc(SIZE, 7));
  writeFileSync(emptyAab, Buffer.alloc(0));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  // The waits between retries are real seconds; a test has no use for them.
  jest.spyOn(global, 'setTimeout').mockImplementation(((run: () => void) => {
    run();
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as any).fetch;
});

describe('uploadBundle', () => {
  it('opens a resumable session and sends the file part by part, each with its byte range', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, {}, { location: SESSION }))
      .mockResolvedValueOnce(answer(308, null, { range: `bytes=0-${PART - 1}` }))
      .mockResolvedValueOnce(answer(200, { versionCode: 42, sha256: 'abc' }));

    const bundle = await uploadBundle('tok', 'com.example.app', 'edit-1', aab);

    expect(bundle).toEqual({ versionCode: 42, sha256: 'abc' });
    const open = callOf(0);
    expect(open.url).toBe(
      'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/com.example.app/edits/edit-1/bundles?uploadType=resumable',
    );
    expect(open.method).toBe('POST');
    expect(open.headers).toMatchObject({ Authorization: 'Bearer tok', 'X-Upload-Content-Length': String(SIZE) });
    // The parts go to the session address, never the token-bearing API.
    expect(callOf(1).url).toBe(SESSION);
    expect(callOf(1).headers['Content-Range']).toBe(`bytes 0-${PART - 1}/${SIZE}`);
    expect(callOf(1).body).toHaveLength(PART);
    expect(callOf(2).headers['Content-Range']).toBe(`bytes ${PART}-${SIZE - 1}/${SIZE}`);
    expect(callOf(2).body).toHaveLength(1024);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('asks Google how far a dropped part got and carries on from there instead of starting over', async () => {
    const held = 4 * 1024 * 1024;
    const log: string[] = [];
    fetchMock
      .mockResolvedValueOnce(answer(200, {}, { location: SESSION }))
      .mockRejectedValueOnce(dropped('ECONNRESET'))
      .mockResolvedValueOnce(answer(308, null, { range: `bytes=0-${held - 1}` }))
      .mockResolvedValueOnce(answer(308, null, { range: `bytes=0-${PART + held - 1 > SIZE - 1 ? SIZE - 2 : PART + held - 1}` }))
      .mockResolvedValueOnce(answer(200, { versionCode: 7, sha256: 'def' }));

    const bundle = await uploadBundle('tok', 'com.example.app', 'edit-1', aab, (line) => log.push(line));

    expect(bundle.versionCode).toBe(7);
    // The question carries no bytes: "how much of the whole do you hold?"
    expect(callOf(2).headers['Content-Range']).toBe(`bytes */${SIZE}`);
    expect(callOf(2).body).toBeUndefined();
    // The next part starts at the byte Google asked for, not at zero.
    expect(callOf(3).headers['Content-Range']).toMatch(new RegExp(`^bytes ${held}-`));
    expect(log.some((line) => line.includes('ECONNRESET') && line.includes('attempt 1 of 4'))).toBe(true);
  });

  it('starts from zero when Google reports it holds nothing yet', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, {}, { location: SESSION }))
      .mockRejectedValueOnce(dropped('ECONNRESET'))
      .mockResolvedValueOnce(answer(308))
      .mockResolvedValueOnce(answer(308, null, { range: `bytes=0-${PART - 1}` }))
      .mockResolvedValueOnce(answer(200, { versionCode: 9 }));

    await uploadBundle('tok', 'com.example.app', 'edit-1', aab);

    expect(callOf(3).headers['Content-Range']).toBe(`bytes 0-${PART - 1}/${SIZE}`);
  });

  it('gives up after four failures in a row, and says why and how much was sent', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, {}, { location: SESSION })).mockRejectedValue(dropped('ECONNRESET'));

    await expect(uploadBundle('tok', 'com.example.app', 'edit-1', aab)).rejects.toThrow(
      /ECONNRESET.*\(0% of the bundle was sent, 4 attempt\(s\) failed in a row\)/,
    );
    // One open, one part, then three questions — never a fifth attempt.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('treats a refusal from Google as final — no retry can change a 403', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, {}, { location: SESSION }))
      .mockResolvedValueOnce(answer(403, { error: { message: 'The caller does not have permission' } }));

    await expect(uploadBundle('tok', 'com.example.app', 'edit-1', aab)).rejects.toThrow(
      'Google Play refused the request (HTTP 403): The caller does not have permission',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a part Google answered with a 503', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, {}, { location: SESSION }))
      .mockResolvedValueOnce(answer(503, { error: { message: 'Backend Error' } }))
      .mockResolvedValueOnce(answer(308, null, { range: `bytes=0-${PART - 1}` }))
      .mockResolvedValueOnce(answer(200, { versionCode: 11 }));

    expect((await uploadBundle('tok', 'com.example.app', 'edit-1', aab)).versionCode).toBe(11);
  });

  it('refuses an empty file before opening anything, and a session Google opened without an address', async () => {
    await expect(uploadBundle('tok', 'com.example.app', 'edit-1', emptyAab)).rejects.toThrow('The stored AAB is empty');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(answer(200, {}));
    await expect(uploadBundle('tok', 'com.example.app', 'edit-1', aab)).rejects.toThrow('Google Play opened no upload session');

    fetchMock.mockResolvedValueOnce(answer(401, { error: { message: 'Invalid Credentials' } }));
    await expect(uploadBundle('tok', 'com.example.app', 'edit-1', aab)).rejects.toThrow(
      'Google Play refused the request (HTTP 401): Invalid Credentials',
    );
  });
});

describe('releaseBundle', () => {
  const cfg = { account: { client_email: 'ci@example.test', private_key: 'not-a-real-key' }, packageName: 'com.example.app' };

  it('names the step a failure happened in, with the real reason, and logs every step', async () => {
    const log: string[] = [];
    // The edit opens; listing the bundles drops; the edit is then discarded.
    fetchMock
      .mockResolvedValueOnce(answer(200, { id: 'edit-9' }))
      .mockRejectedValueOnce(dropped('ECONNRESET'))
      .mockResolvedValueOnce(answer(200, {}));

    await expect(releaseBundle(cfg, aab, 'internal', 'v1 (abc1234)', { onStep: (line) => log.push(line) })).rejects.toThrow(
      /\(while listing the uploaded bundles\)$/,
    );

    expect(log[0]).toBe('signing in to Google…');
    expect(log).toContain('opening a release edit…');
    expect(log.at(-1)).toMatch(/^listing the uploaded bundles: FAILED after \d+ ms — /);
    // No step log line ever carries the token.
    expect(log.join('\n')).not.toContain('access-token');
    expect(callOf(2).method).toBe('DELETE');
  });

  it('skips the upload when Google already holds this exact file, then sets the track and commits', async () => {
    const { createHash } = await import('node:crypto');
    const sha256 = createHash('sha256').update(Buffer.alloc(SIZE, 7)).digest('hex');
    const log: string[] = [];
    fetchMock
      .mockResolvedValueOnce(answer(200, { id: 'edit-9' }))
      .mockResolvedValueOnce(answer(200, { bundles: [{ versionCode: 55, sha256 }] }))
      .mockResolvedValueOnce(answer(200, {}))
      .mockResolvedValueOnce(answer(200, {}));

    const versionCode = await releaseBundle(cfg, aab, 'internal', 'v1 (abc1234)', { onStep: (line) => log.push(line) });

    expect(versionCode).toBe(55);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(callOf(2).url).toMatch(/\/edits\/edit-9\/tracks\/internal$/);
    expect(JSON.parse(String(callOf(2).body)).releases[0].versionCodes).toEqual(['55']);
    expect(callOf(3).url).toMatch(/\/edits\/edit-9:commit$/);
    expect(log).toContain('Google already holds this bundle as version code 55 — not uploaded again');
    expect(log.some((line) => line.startsWith('updating the store listing'))).toBe(false);
  });
});
