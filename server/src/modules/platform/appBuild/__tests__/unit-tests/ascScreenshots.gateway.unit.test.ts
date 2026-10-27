import { syncScreenshotSet } from '../../ascScreenshots.gateway';
import { asc } from '../../appStoreConnect.gateway';
import { putOperation } from '../../ascBuildUpload.gateway';
import type { StoreAsset } from '../../storeAssets';

jest.mock('../../appStoreConnect.gateway', () => ({
  asc: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../ascBuildUpload.gateway', () => ({
  ...jest.requireActual('../../ascBuildUpload.gateway'),
  putOperation: jest.fn(),
}));

const get = asc.get as jest.Mock;
const post = asc.post as jest.Mock;
const patch = asc.patch as jest.Mock;
const del = asc.delete as jest.Mock;

const asset = (name: string, md5: string, bytes = 'abcdef'): StoreAsset => ({ fileName: name, md5, bytes: Buffer.from(bytes), contentType: 'image/png' });
const setsAnswer = (displayType: string, shots: { id: string; checksum?: string }[], extra: unknown[] = []) => ({
  data: [...extra, { id: 'set1', attributes: { screenshotDisplayType: displayType }, relationships: { appScreenshots: { data: shots.map((s) => ({ id: s.id })) } } }],
  included: shots.filter((s) => s.checksum !== undefined).map((s) => ({ id: s.id, attributes: { sourceFileChecksum: s.checksum } })),
});

describe('syncScreenshotSet', () => {
  it('looks the set up on the localization with the checksums included', async () => {
    get.mockResolvedValue(setsAnswer('APP_IPHONE_67', [{ id: 's1', checksum: 'm1' }]));
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('1.png', 'm1')]);
    expect(get.mock.calls[0][1]).toContain('/appStoreVersionLocalizations/loc1/appScreenshotSets?');
    expect(get.mock.calls[0][1]).toContain('include=appScreenshots');
  });

  it('leaves a set alone when the checksums already match in order', async () => {
    get.mockResolvedValue(setsAnswer('APP_IPHONE_67', [{ id: 's1', checksum: 'm1' }, { id: 's2', checksum: 'm2' }]));
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('1.png', 'm1'), asset('2.png', 'm2')]);
    expect(del).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['the order differs', [asset('2.png', 'm2'), asset('1.png', 'm1')]],
    ['a checksum differs', [asset('1.png', 'm1'), asset('2.png', 'mX')]],
    ['there are more images', [asset('1.png', 'm1'), asset('2.png', 'm2'), asset('3.png', 'm3')]],
    ['there are fewer images', [asset('1.png', 'm1')]],
  ])('replaces the whole set when %s', async (_label, assets) => {
    get.mockResolvedValue(setsAnswer('APP_IPHONE_67', [{ id: 's1', checksum: 'm1' }, { id: 's2', checksum: 'm2' }]));
    post.mockImplementation(async (_t: string, path: string) => ({ data: { id: `${path}-id`, attributes: { uploadOperations: [] } } }));
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', assets);
    expect(del.mock.calls.map((c) => c[1])).toEqual(['/appScreenshots/s1', '/appScreenshots/s2']);
    expect(post.mock.calls.filter((c) => c[1] === '/appScreenshots')).toHaveLength(assets.length);
    expect(post.mock.calls.some((c) => c[1] === '/appScreenshotSets')).toBe(false);
  });

  it('creates a missing set with the version localization relationship and uploads parts and checksum', async () => {
    get.mockResolvedValue({ data: [{ id: 'x', attributes: { screenshotDisplayType: 'APP_IPAD_PRO_3GEN_129' } }] });
    post.mockImplementation(async (_t: string, path: string) =>
      path === '/appScreenshotSets'
        ? { data: { id: 'newset' } }
        : { data: { id: 'shot1', attributes: { uploadOperations: [{ method: 'PUT', url: 'https://u/1', length: 3, offset: 0 }, { method: 'PUT', url: 'https://u/2', length: 3, offset: 3 }] } } }
    );
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('a.png', 'md5a', 'abcdef')]);

    expect(post).toHaveBeenCalledWith('jwt', '/appScreenshotSets', {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: 'APP_IPHONE_67' },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: 'loc1' } } },
    });
    expect(post).toHaveBeenCalledWith('jwt', '/appScreenshots', {
      type: 'appScreenshots',
      attributes: { fileName: 'a.png', fileSize: 6 },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: 'newset' } } },
    });
    const parts = (putOperation as jest.Mock).mock.calls.map((c) => [c[0].url, c[1].toString()]);
    expect(parts).toEqual([['https://u/1', 'abc'], ['https://u/2', 'def']]);
    expect(patch).toHaveBeenCalledWith('jwt', '/appScreenshots/shot1', {
      type: 'appScreenshots', id: 'shot1', attributes: { uploaded: true, sourceFileChecksum: 'md5a' },
    });
    expect(del).not.toHaveBeenCalled();
  });

  it('treats a set with screenshots Apple has no checksum for as different, and a non-list answer as no set', async () => {
    get.mockResolvedValue(setsAnswer('APP_IPHONE_67', [{ id: 's1' }, { id: 's2', checksum: 'm2' }]));
    post.mockResolvedValue({ data: { id: 'shot' } });
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('1.png', 'm1'), asset('2.png', 'm2')]);
    expect(del).toHaveBeenCalledTimes(2);

    del.mockClear();
    get.mockResolvedValue({ data: [{ id: 'bare', attributes: { screenshotDisplayType: 'APP_IPHONE_67' } }] });
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('1.png', 'm1')]);
    expect(del).not.toHaveBeenCalled();
    expect(post.mock.calls.at(-1)?.[2].relationships.appScreenshotSet.data.id).toBe('bare');

    del.mockClear();
    post.mockReset();
    get.mockResolvedValue({});
    post.mockResolvedValue({ data: { id: 'newset' } });
    await syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', []);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toBe('/appScreenshotSets');
  });

  it('stops without a checksum commit when a part fails to upload', async () => {
    get.mockResolvedValue({});
    post.mockImplementation(async (_t: string, path: string) =>
      path === '/appScreenshotSets' ? { data: { id: 'newset' } } : { data: { id: 'shot1', attributes: { uploadOperations: [{ url: 'https://u/1', length: 6, offset: 0 }] } } }
    );
    (putOperation as jest.Mock).mockRejectedValueOnce(new Error('store down'));
    await expect(syncScreenshotSet('jwt', 'loc1', 'APP_IPHONE_67', [asset('a.png', 'm')])).rejects.toThrow('store down');
    expect(patch).not.toHaveBeenCalled();
  });
});
