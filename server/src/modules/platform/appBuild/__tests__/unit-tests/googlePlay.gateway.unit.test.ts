import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  commitEdit,
  discardEdit,
  fileSha256,
  listBundles,
  openEdit,
  playAccessToken,
  releaseBundle,
  setTrackRelease,
  uploadBundle,
} from '../../googlePlay.gateway';
import { serviceAccountToken } from '@utils/googleServiceAccount';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@utils/googleServiceAccount', () => ({ serviceAccountToken: jest.fn(async () => 'access-token') }));
jest.mock('@utils/outboundFetch', () => ({ ...jest.requireActual('@utils/outboundFetch'), outboundFetch: jest.fn() }));

const outbound = outboundFetch as jest.Mock;
const reply = (status: number, body: unknown) =>
  outbound.mockResolvedValue({ ok: status < 400, status, json: body instanceof Error ? () => Promise.reject(body) : async () => body });
const replyOnce = (status: number, body: unknown) =>
  outbound.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

let dir: string;
let aab: string;
const AAB_BYTES = Buffer.from('bundle-bytes');
const AAB_SHA = createHash('sha256').update(AAB_BYTES).digest('hex');

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'play-gw-'));
  aab = path.join(dir, 'app.aab');
  writeFileSync(aab, AAB_BYTES);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('errors from Google', () => {
  it.each([
    ['error.message', { error: { message: 'Version code reused' } }, 'Version code reused'],
    ['error_description', { error_description: 'bad grant' }, 'bad grant'],
    ['a plain error string', { error: 'invalid_request' }, 'invalid_request'],
    ['nothing useful', {}, 'no reason given'],
  ])('names %s in a refusal and never a credential', async (_label, body, expected) => {
    reply(403, body);
    await expect(openEdit('tok', 'com.x')).rejects.toMatchObject({
      status: 403,
      message: `Google Play refused the request (HTTP 403): ${expected}`,
    });
  });

  it('treats an unreadable error body as no reason', async () => {
    reply(500, new Error('not json'));
    await expect(openEdit('tok', 'com.x')).rejects.toMatchObject({ status: 500, message: expect.stringContaining('no reason given') });
  });

  it('treats an unreadable success body as empty', async () => {
    reply(200, new Error('not json'));
    await expect(openEdit('tok', 'com.x')).resolves.toBe('undefined');
  });
});

describe('edit calls', () => {
  it('signs in with the androidpublisher scope', async () => {
    await expect(playAccessToken({ client_email: 'sa@x' } as never)).resolves.toBe('access-token');
    expect(serviceAccountToken).toHaveBeenCalledWith({ client_email: 'sa@x' }, 'https://www.googleapis.com/auth/androidpublisher');
  });

  it('opens an edit, commits it, and discards one without ever throwing', async () => {
    reply(200, { id: 'edit-9' });
    await expect(openEdit('tok', 'com.x')).resolves.toBe('edit-9');
    expect(outbound.mock.calls[0][1]).toBe('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.x/edits');
    expect(outbound.mock.calls[0][2]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
    await commitEdit('tok', 'com.x', 'edit-9');
    expect(outbound.mock.calls[1][1]).toMatch(/\/edits\/edit-9:commit$/);
    reply(404, {});
    await expect(discardEdit('tok', 'com.x', 'edit-9')).resolves.toBeUndefined();
    expect(outbound.mock.calls[2][2].method).toBe('DELETE');
  });

  it('lists the uploaded bundles with their hashes, defaulting a missing hash and tolerating no list', async () => {
    reply(200, { bundles: [{ versionCode: '12', sha256: 'abc' }, { versionCode: 13 }] });
    await expect(listBundles('tok', 'com.x', 'e1')).resolves.toEqual([{ versionCode: 12, sha256: 'abc' }, { versionCode: 13, sha256: '' }]);
    reply(200, {});
    await expect(listBundles('tok', 'com.x', 'e1')).resolves.toEqual([]);
  });

  it('points a track at one version code as a completed rollout, with release notes only when given', async () => {
    reply(200, {});
    await setTrackRelease('tok', 'com.x', 'e1', 'production', 42, 'Release 1');
    let body = JSON.parse(outbound.mock.calls[0][2].body);
    expect(body).toEqual({ track: 'production', releases: [{ name: 'Release 1', versionCodes: ['42'], status: 'completed' }] });
    await setTrackRelease('tok', 'com.x', 'e1', 'internal', 43, 'R2', [{ language: 'en-US', text: 'Fixes' }]);
    body = JSON.parse(outbound.mock.calls[1][2].body);
    expect(body.releases[0].releaseNotes).toEqual([{ language: 'en-US', text: 'Fixes' }]);
    expect(outbound.mock.calls[1][1]).toMatch(/\/tracks\/internal$/);
  });
});

describe('fileSha256', () => {
  it('hashes a file on disk', async () => {
    await expect(fileSha256(aab)).resolves.toBe(AAB_SHA);
  });

  it('rejects when the file cannot be read', async () => {
    await expect(fileSha256(path.join(dir, 'missing.aab'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('uploadBundle: session', () => {
  it('names a refusal to open the session', async () => {
    reply(403, { error: { message: 'no rights' } });
    await expect(uploadBundle('tok', 'com.x', 'e1', aab)).rejects.toMatchObject({ message: expect.stringContaining('no rights') });
  });

  it('treats an unreadable refusal body as no reason', async () => {
    reply(500, new Error('x'));
    await expect(uploadBundle('tok', 'com.x', 'e1', aab)).rejects.toMatchObject({ message: expect.stringContaining('no reason given') });
  });
});

describe('uploadBundle: part answers', () => {
  it('fails on a part Google refused with a body that is not JSON, naming no reason', async () => {
    outbound.mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'https://upload.test/session' }, json: async () => ({}) });
    const realFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(new Response('<html>nope</html>', { status: 400 })) as never;
    try {
      await expect(uploadBundle('tok', 'com.x', 'e1', aab)).rejects.toMatchObject({
        message: expect.stringContaining('Google Play refused the request (HTTP 400): no reason given'),
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = realFetch;
    }
  });
});

describe('releaseBundle', () => {
  const cfg = { account: { client_email: 'sa@x' } as never, packageName: 'com.x' };
  const stepsOf = (log: jest.Mock) => log.mock.calls.map((c) => c[0] as string);

  it('applies the listing and release notes inside the edit, in order, and reports each step', async () => {
    replyOnce(200, { id: 'e1' }); // open
    replyOnce(200, { bundles: [{ versionCode: 77, sha256: AAB_SHA }] }); // list: already uploaded
    replyOnce(200, {}); // track
    replyOnce(200, {}); // commit
    const applyListing = jest.fn().mockResolvedValue(undefined);
    const onStep = jest.fn();
    await expect(
      releaseBundle(cfg, aab, 'production', 'Release 5', { applyListing, releaseNotes: [{ language: 'en-US', text: 'New' }], onStep })
    ).resolves.toBe(77);

    expect(applyListing).toHaveBeenCalledWith('access-token', 'e1');
    const track = JSON.parse(outbound.mock.calls[2][2].body);
    expect(track.releases[0]).toMatchObject({ versionCodes: ['77'], releaseNotes: [{ language: 'en-US', text: 'New' }] });
    expect(stepsOf(onStep)).toEqual(expect.arrayContaining([
      'signing in to Google…',
      'Google already holds this bundle as version code 77 — not uploaded again',
      'updating the store listing…',
      'setting the track…',
      'committing the release…',
    ]));
    expect(stepsOf(onStep).some((l) => l.startsWith('uploading the bundle'))).toBe(false);
  });

  it('uploads the bundle when Google does not hold this file yet, then releases it', async () => {
    replyOnce(200, { id: 'e1' }); // open edit
    replyOnce(200, { bundles: [{ versionCode: 5, sha256: 'someone-elses' }] }); // list
    outbound.mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'https://upload.test/session' }, json: async () => ({}) }); // open upload session
    const part = jest.fn().mockResolvedValue(new Response(JSON.stringify({ versionCode: 99, sha256: AAB_SHA }), { status: 200 }));
    const realFetch = global.fetch;
    global.fetch = part as never;
    try {
      replyOnce(200, {}); // track
      replyOnce(200, {}); // commit
      const onStep = jest.fn();
      await expect(releaseBundle(cfg, aab, 'production', 'R', { onStep })).resolves.toBe(99);
      expect(part).toHaveBeenCalledTimes(1);
      expect(stepsOf(onStep).some((l) => l.startsWith('uploading the bundle: done'))).toBe(true);
      expect(JSON.parse(outbound.mock.calls.at(-2)?.[2].body).releases[0].versionCodes).toEqual(['99']);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('runs without extras and without a step log', async () => {
    replyOnce(200, { id: 'e1' });
    replyOnce(200, { bundles: [{ versionCode: 5, sha256: AAB_SHA }] });
    replyOnce(200, {});
    replyOnce(200, {});
    await expect(releaseBundle(cfg, aab, 'internal', 'R')).resolves.toBe(5);
  });

  it('discards the edit and rethrows when a step fails, naming the step', async () => {
    replyOnce(200, { id: 'e1' });
    replyOnce(200, { bundles: [{ versionCode: 5, sha256: AAB_SHA }] });
    replyOnce(400, { error: { message: 'bad track' } });
    outbound.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const onStep = jest.fn();
    await expect(releaseBundle(cfg, aab, 'production', 'R', { onStep })).rejects.toThrow('bad track');
    expect(stepsOf(onStep).some((l) => l.startsWith('setting the track: FAILED'))).toBe(true);
    expect(outbound.mock.calls.at(-1)?.[2].method).toBe('DELETE');
  });

  it('reports a non-Error failure by its text', async () => {
    (serviceAccountToken as jest.Mock).mockRejectedValueOnce('bad key');
    await expect(releaseBundle(cfg, aab, 'production', 'R')).rejects.toThrow('bad key (while signing in to Google)');
  });
});
