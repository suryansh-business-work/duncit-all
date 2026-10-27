import { createHash } from 'node:crypto';
import { fetchStoreAsset, fetchStoreAssets } from '../../storeAssets';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const image = (contentType: string | null, body = 'pixels', ok = true, status = 200) =>
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    headers: { get: () => contentType },
    arrayBuffer: async () => Uint8Array.from(Buffer.from(body)).buffer,
  });

describe('fetchStoreAsset', () => {
  it('returns the bytes, an MD5 of them, the content type and the file name from the url', async () => {
    image('image/png', 'pixels');
    const asset = await fetchStoreAsset('https://ik.imagekit.io/acme/shots/home screen.png?tr=w-400');
    expect(asset).toEqual({
      fileName: 'home_20screen.png',
      bytes: Buffer.from('pixels'),
      md5: createHash('md5').update('pixels').digest('hex'),
      contentType: 'image/png',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('ImageKit');
    expect(fetchMock.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  });

  it('accepts JPEG with parameters on the content type', async () => {
    image('image/jpeg; charset=binary');
    await expect(fetchStoreAsset('https://x/a.jpg')).resolves.toMatchObject({ contentType: 'image/jpeg', fileName: 'a.jpg' });
  });

  it('adds an extension from the content type when the url has none', async () => {
    image('image/jpeg');
    await expect(fetchStoreAsset('https://x/path/shot')).resolves.toMatchObject({ fileName: 'shot.jpg' });
    image('image/png');
    await expect(fetchStoreAsset('https://x/path/shot')).resolves.toMatchObject({ fileName: 'shot.png' });
  });

  it('numbers an image whose url has no file name at all', async () => {
    image('image/png');
    await expect(fetchStoreAsset('https://x/', 2)).resolves.toMatchObject({ fileName: 'image-3.png' });
    image('image/png');
    await expect(fetchStoreAsset('https://x/')).resolves.toMatchObject({ fileName: 'image-1.png' });
  });

  it('refuses a failed download, naming the status and url', async () => {
    image('image/png', '', false, 404);
    await expect(fetchStoreAsset('https://x/a.png')).rejects.toThrow('Could not fetch listing image (HTTP 404): https://x/a.png');
  });

  it('refuses anything that is not PNG or JPEG, with the type it saw', async () => {
    image('image/webp');
    await expect(fetchStoreAsset('https://x/a.webp')).rejects.toThrow('Listing image is image/webp, not PNG or JPEG: https://x/a.webp');
    image(null);
    await expect(fetchStoreAsset('https://x/a')).rejects.toThrow('Listing image is of unknown type, not PNG or JPEG: https://x/a');
  });
});

describe('fetchStoreAssets', () => {
  it('fetches every image, numbering them in listing order', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => new ArrayBuffer(1),
    }));
    const assets = await fetchStoreAssets(['https://x/', 'https://x/b.png', 'https://x/']);
    expect(assets.map((a) => a.fileName)).toEqual(['image-1.png', 'b.png', 'image-3.png']);
  });

  it('is empty for no urls', async () => {
    await expect(fetchStoreAssets([])).resolves.toEqual([]);
  });
});
