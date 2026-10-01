import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { parseServiceAccount, serviceAccountToken } from '@utils/googleServiceAccount';
import {
  driveAccountEmail,
  driveContent,
  driveFile,
  driveFolder,
  driveThumbnail,
  driveToken,
  parseDriveFolderId,
  probeDriveAccount,
} from '../../reel.drive';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/googleServiceAccount', () => ({ parseServiceAccount: jest.fn(), serviceAccountToken: jest.fn() }));

const mockEnv = getRuntimeEnvValue as jest.Mock;
const mockParse = parseServiceAccount as jest.Mock;
const mockSignIn = serviceAccountToken as jest.Mock;

const ACCOUNT = { client_email: 'reels@duncit-drive.iam.gserviceaccount.com', private_key: 'key' };
const FOLDER_ID = '1AbCdEfGhIjKlMnOp';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

let fetchMock: jest.SpyInstance;
let keySerial = 0;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** The URL of the n-th request the code made. */
const requested = (index: number): URL => new URL(String(fetchMock.mock.calls[index][0]));

beforeEach(() => {
  // A new key per test: the token cache is keyed on the credential, so no test
  // can be answered from a token an earlier one minted.
  keySerial += 1;
  mockEnv.mockResolvedValue(`  {"key":${keySerial}}  `);
  mockParse.mockReturnValue(ACCOUNT);
  mockSignIn.mockResolvedValue('drive-token');
  fetchMock = jest.spyOn(globalThis, 'fetch');
});

afterEach(() => jest.restoreAllMocks());

describe('driveAccountEmail', () => {
  it('is empty while Drive is not set up', async () => {
    mockEnv.mockResolvedValue('   ');
    await expect(driveAccountEmail()).resolves.toBe('');
  });

  it('is the address a folder is shared with', async () => {
    await expect(driveAccountEmail()).resolves.toBe(ACCOUNT.client_email);
  });

  it('is empty when the stored key cannot be read', async () => {
    mockParse.mockImplementation(() => {
      throw new Error('not a key');
    });
    await expect(driveAccountEmail()).resolves.toBe('');
  });
});

describe('driveToken', () => {
  it('refuses while Drive is not connected', async () => {
    mockEnv.mockResolvedValue('');
    await expect(driveToken()).rejects.toMatchObject({ extensions: { code: 'CONFIG_ERROR' } });
  });

  it('reuses a token until shortly before Google would expire it', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await expect(driveToken()).resolves.toBe('drive-token');
    await driveToken();
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(ACCOUNT, 'https://www.googleapis.com/auth/drive.readonly');

    now.mockReturnValue(1_000_000 + 51 * 60_000);
    await driveToken();
    expect(mockSignIn).toHaveBeenCalledTimes(2);
  });

  it('signs in again as soon as the key is replaced', async () => {
    await driveToken();
    mockEnv.mockResolvedValue('{"key":"replaced"}');
    mockSignIn.mockResolvedValue('second-token');
    await expect(driveToken()).resolves.toBe('second-token');
  });

  it('reports a failed sign-in as a configuration problem', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Google refused the service account sign-in'));
    await expect(driveToken()).rejects.toMatchObject({
      message: 'Google refused the service account sign-in',
      extensions: { code: 'CONFIG_ERROR' },
    });
    mockSignIn.mockRejectedValueOnce('boom');
    await expect(driveToken()).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('probeDriveAccount', () => {
  it('answers with the account when Drive accepts the key', async () => {
    fetchMock.mockResolvedValue(json({ user: { emailAddress: ACCOUNT.client_email } }));
    await expect(probeDriveAccount('{"a":1}')).resolves.toBe(ACCOUNT.client_email);
    expect(requested(0).pathname).toBe('/drive/v3/about');
  });

  it('repeats what Google said when it refuses', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Drive API has not been used' } }, 403));
    await expect(probeDriveAccount('{"a":1}')).rejects.toThrow('(HTTP 403): Drive API has not been used');
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 500 }));
    await expect(probeDriveAccount('{"a":1}')).rejects.toThrow('(HTTP 500): no reason given');
  });
});

describe('parseDriveFolderId', () => {
  it.each([
    [FOLDER_ID, FOLDER_ID],
    [`  https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing `, FOLDER_ID],
    [`https://drive.google.com/open?id=${FOLDER_ID}`, FOLDER_ID],
  ])('finds the folder in %s', (input, expected) => {
    expect(parseDriveFolderId(input)).toBe(expected);
  });

  it.each([
    'not a link',
    `https://example.com/drive/folders/${FOLDER_ID}`,
    'https://drive.google.com/drive/my-drive',
    'https://drive.google.com/open?id=short',
  ])('refuses %s', (input) => {
    expect(parseDriveFolderId(input)).toBeNull();
  });
});

describe('driveFile', () => {
  it('reads a video with its length and size', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'v1',
        name: 'jam.mp4',
        mimeType: 'video/mp4',
        size: '2048',
        videoMediaMetadata: { width: 1080, height: 1920, durationMillis: '12000' },
      })
    );
    await expect(driveFile('v1')).resolves.toEqual({
      id: 'v1',
      name: 'jam.mp4',
      mime_type: 'video/mp4',
      kind: 'VIDEO',
      size_bytes: 2048,
      duration_ms: 12_000,
      width: 1080,
      height: 1920,
    });
    expect(requested(0).pathname).toBe('/drive/v3/files/v1');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer drive-token' });
  });

  it('reads a picture, a sound file and a folder, with zeros for what Drive did not say', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ id: 'p1', name: 'cover.png', mimeType: 'image/png', imageMediaMetadata: { width: 800, height: 600 } })
    );
    await expect(driveFile('p1')).resolves.toMatchObject({ kind: 'IMAGE', width: 800, height: 600, duration_ms: 0 });

    fetchMock.mockResolvedValueOnce(json({ id: 's1', mimeType: 'audio/mpeg' }));
    await expect(driveFile('s1')).resolves.toMatchObject({ kind: 'AUDIO', name: '', size_bytes: 0, width: 0, height: 0 });

    fetchMock.mockResolvedValueOnce(json({ id: 'f1', name: 'Shoot', mimeType: FOLDER_MIME }));
    await expect(driveFile('f1')).resolves.toMatchObject({ kind: 'FOLDER', name: 'Shoot' });
  });

  it('is nothing for a kind the studio cannot use, a file with no id, or an empty answer', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'd1', mimeType: 'application/pdf' }));
    await expect(driveFile('d1')).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(json({ mimeType: 'video/mp4' }));
    await expect(driveFile('x')).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(json(null));
    await expect(driveFile('x')).resolves.toBeNull();
  });

  it.each([403, 404])('tells the operator who to share with on a %i', async (status) => {
    fetchMock.mockResolvedValue(json({ error: { message: 'File not found' } }, status));
    await expect(driveFile('v1')).rejects.toMatchObject({
      message: expect.stringContaining(`Share it with ${ACCOUNT.client_email}`),
      extensions: { code: 'DRIVE_ERROR' },
    });
  });

  it('repeats any other refusal, with or without a reason', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Rate limit exceeded' } }, 429));
    await expect(driveFile('v1')).rejects.toThrow('(HTTP 429): Rate limit exceeded');
    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 500 }));
    await expect(driveFile('v1')).rejects.toThrow('(HTTP 500): no reason given');
  });
});

describe('driveFolder', () => {
  const folder = () => json({ id: FOLDER_ID, name: 'Jam shoot', mimeType: FOLDER_MIME });
  const clip = (id: string) => ({ id, name: `${id}.mp4`, mimeType: 'video/mp4' });

  it('refuses a link that is not a folder', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'v1', mimeType: 'video/mp4' }));
    await expect(driveFolder('v1')).rejects.toThrow('not a folder');
    fetchMock.mockResolvedValueOnce(json({ id: 'd1', mimeType: 'application/pdf' }));
    await expect(driveFolder('d1')).rejects.toMatchObject({ extensions: { code: 'DRIVE_ERROR' } });
  });

  it('lists every page, leaving out what the studio cannot use', async () => {
    fetchMock
      .mockResolvedValueOnce(folder())
      .mockResolvedValueOnce(json({ files: [clip('a'), { id: 'doc', mimeType: 'application/pdf' }], nextPageToken: 'page-2' }))
      .mockResolvedValueOnce(json({ files: [clip('b')] }));
    const listing = await driveFolder(FOLDER_ID);
    expect(listing).toMatchObject({ id: FOLDER_ID, name: 'Jam shoot', truncated: false });
    expect(listing.entries.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(requested(1).searchParams.get('q')).toBe(`'${FOLDER_ID}' in parents and trashed = false`);
    expect(requested(1).searchParams.has('pageToken')).toBe(false);
    expect(requested(2).searchParams.get('pageToken')).toBe('page-2');
  });

  it('says so when the folder holds more than it lists', async () => {
    fetchMock
      .mockResolvedValueOnce(folder())
      .mockResolvedValueOnce(json({ files: [clip('a')], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(json({ files: 'none', nextPageToken: 'p3' }))
      .mockResolvedValueOnce(json({ files: [clip('c')], nextPageToken: 'p4' }));
    const listing = await driveFolder(FOLDER_ID);
    expect(listing.truncated).toBe(true);
    expect(listing.entries.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('driveContent', () => {
  it('asks for the range the viewer asked for', async () => {
    const upstream = new Response('bytes', { status: 206 });
    fetchMock.mockResolvedValue(upstream);
    const { signal } = new AbortController();
    await expect(driveContent('v 1', 'bytes=0-99', signal)).resolves.toBe(upstream);
    expect(requested(0).pathname).toBe('/drive/v3/files/v%201');
    expect(requested(0).searchParams.get('alt')).toBe('media');
    expect(fetchMock.mock.calls[0][1]).toEqual({
      headers: { Authorization: 'Bearer drive-token', Range: 'bytes=0-99' },
      signal,
    });
  });

  it('asks for the whole file when there is no range', async () => {
    fetchMock.mockResolvedValue(new Response('bytes'));
    await driveContent('v1', '', new AbortController().signal);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer drive-token' });
  });
});

describe('driveThumbnail', () => {
  it('is nothing while Drive has not made a preview', async () => {
    fetchMock.mockResolvedValueOnce(json({})).mockResolvedValueOnce(json(null));
    await expect(driveThumbnail('v1')).resolves.toBeNull();
    await expect(driveThumbnail('v1')).resolves.toBeNull();
  });

  it('fetches the preview at the size the studio shows it', async () => {
    const frame = new Response('jpeg');
    fetchMock
      .mockResolvedValueOnce(json({ thumbnailLink: 'https://lh3.googleusercontent.com/abc=s220' }))
      .mockResolvedValueOnce(frame);
    await expect(driveThumbnail('v1')).resolves.toBe(frame);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://lh3.googleusercontent.com/abc=s480');
  });

  it('is nothing when the preview cannot be fetched', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ thumbnailLink: 'https://lh3.googleusercontent.com/abc=s220' }))
      .mockResolvedValueOnce(new Response('gone', { status: 404 }));
    await expect(driveThumbnail('v1')).resolves.toBeNull();
  });
});
