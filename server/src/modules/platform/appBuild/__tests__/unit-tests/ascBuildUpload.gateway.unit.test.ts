import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GraphQLError } from 'graphql';
import {
  commitBuildUploadFile,
  createBuildUpload,
  deleteBuildUpload,
  findBuild,
  parseOperations,
  putFileParts,
  putOperation,
  readBuildProcessingState,
  readBuildUpload,
  reserveBuildUploadFile,
  type UploadOperation,
} from '../../ascBuildUpload.gateway';
import { asc, AscError } from '../../appStoreConnect.gateway';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('../../appStoreConnect.gateway', () => ({
  ...jest.requireActual('../../appStoreConnect.gateway'),
  asc: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const op = (over: Partial<UploadOperation> = {}): UploadOperation => ({
  method: 'PUT', url: 'https://store/part1', length: 4, offset: 0, requestHeaders: [{ name: 'x-amz', value: 'v' }], ...over,
});

describe('parseOperations', () => {
  it('reads Apple’s operations, defaulting every missing field', () => {
    expect(
      parseOperations([
        { method: 'POST', url: 'https://u', length: '12', offset: '3', requestHeaders: [{ name: 'a', value: 'b' }, {}] },
        {},
      ])
    ).toEqual([
      { method: 'POST', url: 'https://u', length: 12, offset: 3, requestHeaders: [{ name: 'a', value: 'b' }, { name: '', value: '' }] },
      { method: 'PUT', url: '', length: 0, offset: 0, requestHeaders: [] },
    ]);
  });

  it('is empty for anything that is not a list', () => {
    expect(parseOperations(undefined)).toEqual([]);
    expect(parseOperations('x')).toEqual([]);
  });
});

describe('putOperation', () => {
  it('sends the bytes with exactly the headers Apple asked for', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const bytes = Buffer.from('data');
    await putOperation(op(), bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [label, url, init] = fetchMock.mock.calls[0];
    expect(label).toBe("Apple's upload store");
    expect(url).toBe('https://store/part1');
    expect(init).toMatchObject({ method: 'PUT', headers: { 'x-amz': 'v' }, body: bytes });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends a part again after a transient refusal and stops once it lands', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: false, status: 429 }).mockResolvedValueOnce({ ok: true });
    await expect(putOperation(op(), Buffer.from('x'))).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a network failure reported as bad gateway', async () => {
    fetchMock
      .mockRejectedValueOnce(new GraphQLError('network', { extensions: { code: 'BAD_GATEWAY' } }))
      .mockResolvedValueOnce({ ok: true });
    await putOperation(op(), Buffer.from('x'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after three attempts with the refusal naming the offset', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(putOperation(op({ offset: 40 }), Buffer.from('x'))).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('the upload store refused the part at offset 40'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a permanent refusal or an unknown error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(putOperation(op(), Buffer.from('x'))).rejects.toBeInstanceOf(AscError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockClear();
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    await expect(putOperation(op(), Buffer.from('x'))).rejects.toThrow('boom');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('putFileParts', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-'));
    file = path.join(dir, 'app.ipa');
    fs.writeFileSync(file, 'ABCDEFGHIJ');
    fetchMock.mockResolvedValue({ ok: true });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('sends each part from its offset and proves it is alive between parts', async () => {
    const afterPart = jest.fn().mockResolvedValue(undefined);
    await putFileParts(file, [op({ length: 4, offset: 0 }), op({ url: 'https://store/part2', length: 4, offset: 4 })], afterPart);
    expect(fetchMock.mock.calls.map((c) => (c[2].body as Buffer).toString())).toEqual(['ABCD', 'EFGH']);
    expect(afterPart).toHaveBeenCalledTimes(2);
  });

  it('sends only what exists when a part runs past the end of the file', async () => {
    await putFileParts(file, [op({ length: 8, offset: 6 })], async () => undefined);
    expect((fetchMock.mock.calls[0][2].body as Buffer).toString()).toBe('GHIJ');
  });

  it('closes the file and stops when a part fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const afterPart = jest.fn();
    await expect(putFileParts(file, [op()], afterPart)).rejects.toBeInstanceOf(AscError);
    expect(afterPart).not.toHaveBeenCalled();
  });

  it('does nothing for no operations', async () => {
    await putFileParts(file, [], jest.fn());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ASC calls', () => {
  it('finds the build Apple already holds for a version and build number', async () => {
    (asc.get as jest.Mock).mockResolvedValue({ data: [{ id: 'b1', attributes: { processingState: 'VALID' } }] });
    await expect(findBuild('jwt', 'app1', '1.2.0', '45')).resolves.toEqual({ id: 'b1', processingState: 'VALID' });
    const [token, url] = (asc.get as jest.Mock).mock.calls[0];
    expect(token).toBe('jwt');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('filter[app]')).toBe('app1');
    expect(params.get('filter[version]')).toBe('45');
    expect(params.get('filter[preReleaseVersion.version]')).toBe('1.2.0');
    expect(params.get('limit')).toBe('1');
  });

  it('defaults the processing state to PROCESSING and returns null when there is no build', async () => {
    (asc.get as jest.Mock).mockResolvedValueOnce({ data: [{ id: 'b1' }] });
    await expect(findBuild('t', 'a', '1', '1')).resolves.toEqual({ id: 'b1', processingState: 'PROCESSING' });
    (asc.get as jest.Mock).mockResolvedValueOnce({ data: [] });
    await expect(findBuild('t', 'a', '1', '1')).resolves.toBeNull();
    (asc.get as jest.Mock).mockResolvedValueOnce({});
    await expect(findBuild('t', 'a', '1', '1')).resolves.toBeNull();
  });

  it('reserves the upload for a version and build number', async () => {
    (asc.post as jest.Mock).mockResolvedValue({ data: { id: 77 } });
    await expect(createBuildUpload('jwt', 'app1', '1.2.0', '45')).resolves.toBe('77');
    expect(asc.post).toHaveBeenCalledWith('jwt', '/buildUploads', {
      type: 'buildUploads',
      attributes: { cfBundleShortVersionString: '1.2.0', cfBundleVersion: '45', platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: 'app1' } } },
    });
  });

  it('reserves the IPA file and parses where each part goes', async () => {
    (asc.post as jest.Mock).mockResolvedValue({ data: { id: 'f1', attributes: { uploadOperations: [{ url: 'https://u', length: 5, offset: 0 }] } } });
    await expect(reserveBuildUploadFile('jwt', 'bu1', 'app.ipa', 99)).resolves.toEqual({
      id: 'f1', operations: [{ method: 'PUT', url: 'https://u', length: 5, offset: 0, requestHeaders: [] }],
    });
    expect(asc.post).toHaveBeenCalledWith('jwt', '/buildUploadFiles', expect.objectContaining({
      attributes: { fileName: 'app.ipa', fileSize: 99, assetType: 'ASSET', uti: 'com.apple.ipa' },
      relationships: { buildUpload: { data: { type: 'buildUploads', id: 'bu1' } } },
    }));
    (asc.post as jest.Mock).mockResolvedValue({ data: { id: 'f2' } });
    await expect(reserveBuildUploadFile('jwt', 'bu1', 'app.ipa', 99)).resolves.toEqual({ id: 'f2', operations: [] });
  });

  it('commits the file and deletes an abandoned reservation', async () => {
    await commitBuildUploadFile('jwt', 'f1');
    expect(asc.patch).toHaveBeenCalledWith('jwt', '/buildUploadFiles/f1', { type: 'buildUploadFiles', id: 'f1', attributes: { uploaded: true } });
    await deleteBuildUpload('jwt', 'bu1');
    expect(asc.delete).toHaveBeenCalledWith('jwt', '/buildUploads/bu1');
  });

  it('reads the upload state, the errors Apple listed and the build it became', async () => {
    (asc.get as jest.Mock).mockResolvedValue({
      data: {
        attributes: { state: { state: 'FAILED', errors: [{ description: 'bad icon' }, { code: 'E42' }, {}] } },
        relationships: { build: { data: { id: 'b9' } } },
      },
    });
    await expect(readBuildUpload('jwt', 'bu1')).resolves.toEqual({ state: 'FAILED', errors: ['bad icon', 'E42'], buildId: 'b9' });
    expect((asc.get as jest.Mock).mock.calls[0][1]).toContain('/buildUploads/bu1?');
  });

  it('reads an upload with nothing recorded yet', async () => {
    (asc.get as jest.Mock).mockResolvedValue({ data: { attributes: { state: { state: 'PROCESSING' } } } });
    await expect(readBuildUpload('jwt', 'bu1')).resolves.toEqual({ state: 'PROCESSING', errors: [], buildId: '' });
    (asc.get as jest.Mock).mockResolvedValue({});
    await expect(readBuildUpload('jwt', 'bu1')).resolves.toEqual({ state: '', errors: [], buildId: '' });
  });

  it('reads TestFlight processing, treating a missing state as still processing', async () => {
    (asc.get as jest.Mock).mockResolvedValueOnce({ data: { attributes: { processingState: 'INVALID' } } });
    await expect(readBuildProcessingState('jwt', 'b1')).resolves.toBe('INVALID');
    expect((asc.get as jest.Mock).mock.calls[0][1]).toContain('/builds/b1?');
    (asc.get as jest.Mock).mockResolvedValueOnce({});
    await expect(readBuildProcessingState('jwt', 'b1')).resolves.toBe('PROCESSING');
  });
});
