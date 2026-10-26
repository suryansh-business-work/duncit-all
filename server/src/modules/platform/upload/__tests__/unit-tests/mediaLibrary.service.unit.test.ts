import { mediaLibraryService } from '../../mediaLibrary.service';
import { getImagekitConfig } from '../../upload.service';
import { logs } from '@observability/log';

jest.mock('../../upload.service', () => ({ getImagekitConfig: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

const fetchMock = jest.fn();
const answer = (status: number, body: unknown, statusText = 'Status') =>
  fetchMock.mockResolvedValue({
    ok: status < 400,
    status,
    statusText,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit & { headers: Record<string, string> }];
const lastUrl = () => new URL(lastCall()[0]);

beforeEach(() => {
  global.fetch = fetchMock as never;
  (getImagekitConfig as jest.Mock).mockResolvedValue({ privateKey: 'private_x' });
});

describe('authentication and errors', () => {
  it('refuses when ImageKit has no private key, before calling out', async () => {
    (getImagekitConfig as jest.Mock).mockResolvedValue({ privateKey: '' });
    await expect(mediaLibraryService.byId('f1')).rejects.toMatchObject({
      message: expect.stringContaining('ImageKit is not configured'),
      extensions: { code: 'CONFIG_ERROR' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs every call with Basic auth on the private key', async () => {
    answer(200, { fileId: 'f1' });
    await mediaLibraryService.byId('f1');
    expect(lastCall()[0]).toBe('https://api.imagekit.io/v1/files/f1/details');
    expect(lastCall()[1].headers.Authorization).toBe(`Basic ${Buffer.from('private_x:').toString('base64')}`);
    expect(lastCall()[1].headers['Content-Type']).toBeUndefined();
  });

  it('carries ImageKit’s own message through as a bad-gateway error and logs it', async () => {
    answer(404, { message: 'File not found' });
    await expect(mediaLibraryService.byId('f1')).rejects.toMatchObject({
      message: 'ImageKit: File not found',
      extensions: { code: 'BAD_GATEWAY' },
    });
    expect(logs.server.warn).toHaveBeenCalledWith('mediaLibrary', 'imagekit', { path: '/files/f1/details', status: 404, message: 'File not found' });
  });

  it('falls back to the status text when the error body has no message or is empty', async () => {
    answer(500, {}, 'Server Error');
    await expect(mediaLibraryService.byId('f1')).rejects.toMatchObject({ message: 'ImageKit: Server Error' });
    answer(502, undefined, 'Bad Gateway');
    await expect(mediaLibraryService.byId('f1')).rejects.toMatchObject({ message: 'ImageKit: Bad Gateway' });
  });
});

describe('list', () => {
  it('maps files and folders to items, defaulting every missing field', async () => {
    answer(200, [
      { fileId: 'a', name: 'a.jpg', filePath: '/a.jpg', url: 'https://x/a.jpg', thumbnail: 't', type: 'file', fileType: 'image', mime: 'image/jpeg', size: 12, width: 1, height: 2, tags: [1, 'b'], createdAt: 'c', updatedAt: 'u', versionId: 'v' },
      { folderId: 'fo', name: 'dir', type: 'folder' },
      {},
    ]);
    const items = await mediaLibraryService.list({});
    expect(items[0]).toEqual({
      fileId: 'a', name: 'a.jpg', filePath: '/a.jpg', url: 'https://x/a.jpg', thumbnail: 't', type: 'file', fileType: 'image',
      mime: 'image/jpeg', size: 12, width: 1, height: 2, tags: ['1', 'b'], createdAt: 'c', updatedAt: 'u', versionId: 'v',
    });
    expect(items[1]).toMatchObject({ fileId: 'fo', name: 'dir', type: 'folder', size: 0, tags: [], thumbnail: null, fileType: null, versionId: null });
    expect(items[2]).toEqual({
      fileId: '', name: '', filePath: '', url: '', thumbnail: null, type: 'file', fileType: null, mime: null, size: 0,
      width: null, height: null, tags: [], createdAt: null, updatedAt: null, versionId: null,
    });
  });

  it('asks for the newest 40 by default and builds a name-contains search', async () => {
    answer(200, []);
    await mediaLibraryService.list({ search: '  say "hi"  ', path: '/pods', fileType: 'image' });
    const params = lastUrl().searchParams;
    expect(lastUrl().pathname).toBe('/v1/files');
    expect(params.get('limit')).toBe('40');
    expect(params.get('skip')).toBe('0');
    expect(params.get('sort')).toBe('DESC_CREATED');
    expect(params.get('path')).toBe('/pods');
    expect(params.get('fileType')).toBe('image');
    expect(params.get('searchQuery')).toBe('name : "say \\"hi\\""');
  });

  it('clamps limit and skip, honours a sort, ignores unknown file types and blank searches', async () => {
    answer(200, []);
    await mediaLibraryService.list({ limit: 5000, skip: -4, sort: 'ASC_NAME', fileType: 'video', search: '   ' });
    let params = lastUrl().searchParams;
    expect(params.get('limit')).toBe('1000');
    expect(params.get('skip')).toBe('0');
    expect(params.get('sort')).toBe('ASC_NAME');
    expect(params.has('fileType')).toBe(false);
    expect(params.has('searchQuery')).toBe(false);
    expect(params.has('path')).toBe(false);
    await mediaLibraryService.list({ limit: 0, skip: 20, fileType: 'non-image', search: null });
    params = lastUrl().searchParams;
    expect(params.get('limit')).toBe('1');
    expect(params.get('skip')).toBe('20');
    expect(params.get('fileType')).toBe('non-image');
  });

  it('is empty when ImageKit answers with nothing', async () => {
    answer(200, null);
    await expect(mediaLibraryService.list({})).resolves.toEqual([]);
  });
});

describe('remove', () => {
  it('does nothing for an empty list', async () => {
    await expect(mediaLibraryService.remove([], { id: 'u1' })).resolves.toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes in one call, logs who did it and counts what ImageKit removed', async () => {
    answer(200, { successfullyDeletedFileIds: ['a', 'b'] });
    await expect(mediaLibraryService.remove(['a', 'b', 'c'], { id: 'u1' })).resolves.toBe(2);
    expect(lastCall()[0]).toBe('https://api.imagekit.io/v1/files/batch/deleteByFileIds');
    expect(lastCall()[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ fileIds: ['a', 'b', 'c'] }) });
    expect(lastCall()[1].headers['Content-Type']).toBe('application/json');
    expect(logs.server.warn).toHaveBeenCalledWith('mediaLibrary', 'delete', { userId: 'u1', count: 3 });
  });

  it('counts zero when the answer carries no list', async () => {
    answer(200, {});
    await expect(mediaLibraryService.remove(['a'], { id: 'u1' })).resolves.toBe(0);
    answer(200, null);
    await expect(mediaLibraryService.remove(['a'], { id: 'u1' })).resolves.toBe(0);
  });
});

describe('rename and update', () => {
  it('renames by the file’s current path, then re-reads the file', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ fileId: 'f1', filePath: '/old/a.jpg' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ fileId: 'f1', name: 'b.jpg', filePath: '/old/b.jpg' }) });
    const item = await mediaLibraryService.rename('f1', 'b.jpg', true);
    expect(item).toMatchObject({ name: 'b.jpg' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.imagekit.io/v1/files/rename');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ filePath: '/old/a.jpg', newFileName: 'b.jpg', purgeCache: true }),
    });
  });

  it('patches only the tags and focus rectangle that were sent', async () => {
    answer(200, { fileId: 'f1' });
    await mediaLibraryService.update('f1', { tags: ['x'], customCoordinates: '1,2,3,4' });
    expect(lastCall()[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ tags: ['x'], customCoordinates: '1,2,3,4' }) });
    await mediaLibraryService.update('f1', { tags: null, customCoordinates: '' });
    expect(lastCall()[1].body).toBe('{}');
  });
});

describe('hasAudio', () => {
  it('is true only when ImageKit names an audio codec', async () => {
    answer(200, { audioCodec: 'aac' });
    await expect(mediaLibraryService.hasAudio('https://x/v.mp4')).resolves.toBe(true);
    expect(lastUrl().pathname).toBe('/v1/metadata');
    expect(lastUrl().searchParams.get('url')).toBe('https://x/v.mp4');
    answer(200, {});
    await expect(mediaLibraryService.hasAudio('u')).resolves.toBe(false);
    answer(200, null);
    await expect(mediaLibraryService.hasAudio('u')).resolves.toBe(false);
  });
});

describe('createFolder', () => {
  it('creates the last segment under its parents', async () => {
    answer(201, {});
    await mediaLibraryService.createFolder('/production/pods/p1/media');
    expect(lastCall()[0]).toBe('https://api.imagekit.io/v1/folder');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ folderName: 'media', parentFolderPath: '/production/pods/p1' });
  });

  it('puts a top-level folder under the root', async () => {
    answer(201, {});
    await mediaLibraryService.createFolder('/top');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ folderName: 'top', parentFolderPath: '/' });
  });

  it('does nothing for an empty path', async () => {
    await mediaLibraryService.createFolder('/');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('copy and purge', () => {
  it('copies without versions so the source stays put', async () => {
    answer(200, {});
    await mediaLibraryService.copy('/a/b.jpg', '/c');
    expect(lastCall()[0]).toBe('https://api.imagekit.io/v1/files/copy');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ sourceFilePath: '/a/b.jpg', destinationPath: '/c', includeFileVersions: false });
  });

  it('purges a url and returns the request id, or an empty one', async () => {
    answer(201, { requestId: 'req1' });
    await expect(mediaLibraryService.purge('https://x/a.jpg')).resolves.toBe('req1');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ url: 'https://x/a.jpg' });
    answer(201, {});
    await expect(mediaLibraryService.purge('u')).resolves.toBe('');
    answer(201, null);
    await expect(mediaLibraryService.purge('u')).resolves.toBe('');
  });
});
