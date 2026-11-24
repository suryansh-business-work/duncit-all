import { importRemoteMedia } from '@modules/platform/upload/upload.service';
import type { IReelProject, ReelAsset } from '../../reel.model';
import { jamendoTrack } from '../../reel.jamendo';
import { pickedStockAssets } from '../../reel.picks';
import { PIXABAY_LICENCE } from '../../reel.pixabay';
import type { ReelStockAssetInput } from '../../reel.stock';

jest.mock('@modules/platform/upload/upload.service', () => ({ importRemoteMedia: jest.fn(), pexelsSearch: jest.fn(), pexelsSearchVideos: jest.fn() }));
jest.mock('../../reel.jamendo', () => ({
  ...jest.requireActual('../../reel.jamendo'),
  jamendoTrack: jest.fn(),
}));

const importMock = importRemoteMedia as jest.Mock;
const trackMock = jamendoTrack as jest.Mock;
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };

const doc = (assets: Partial<ReelAsset>[] = []) => ({ assets }) as unknown as IReelProject;

const pick = (over: Partial<ReelStockAssetInput> = {}): ReelStockAssetInput => ({
  provider_id: '77',
  kind: 'VIDEO',
  url: 'https://cdn.pixabay.com/video/2024/01/77_medium.mp4',
  name: 'Video by Arun on Pixabay',
  width: 1080,
  height: 1920,
  duration_ms: 9000,
  licence: 'anything the browser said',
  attribution: 'Video by Arun on Pixabay',
  provider: 'PIXABAY',
  ...over,
});

beforeEach(() => {
  importMock.mockImplementation(async ({ fileName }: { fileName: string }) => ({ url: `https://ik.imagekit.io/duncit/reels/stock/${fileName}.mp4` }));
});

describe('pickedStockAssets', () => {
  it('copies a Pixabay pick into the media store and keeps it under its library\'s name', async () => {
    const [asset] = await pickedStockAssets(doc(), [pick()]);
    expect(importMock).toHaveBeenCalledWith(expect.objectContaining({ remoteUrl: pick().url, folder: '/reels/stock', fileName: 'pixabay-77', tags: ['reel', 'pixabay'] }));
    expect(asset).toMatchObject({
      kind: 'VIDEO',
      source: 'STOCK',
      url: 'https://ik.imagekit.io/duncit/reels/stock/pixabay-77.mp4',
      mime_type: 'video/mp4',
      duration_ms: 9000,
      // The licence is the server's, never what the browser sent.
      licence: PIXABAY_LICENCE,
      provider_id: 'pixabay:77',
    });
  });

  it('refuses a Pixabay pick that is not on Pixabay, or is sound', async () => {
    await expect(pickedStockAssets(doc(), [pick({ url: 'https://evil.example/77.mp4' })])).rejects.toMatchObject(BAD_INPUT);
    await expect(pickedStockAssets(doc(), [pick({ url: 'http://cdn.pixabay.com/77.mp4' })])).rejects.toMatchObject(BAD_INPUT);
    await expect(pickedStockAssets(doc(), [pick({ kind: 'AUDIO' })])).rejects.toMatchObject(BAD_INPUT);
    expect(importMock).not.toHaveBeenCalled();
  });

  it('re-reads a Jamendo track by id and imports its download, with Jamendo\'s licence and credit', async () => {
    trackMock.mockResolvedValue({
      id: '9',
      name: 'Rally',
      artist_name: 'Nets',
      duration: 61,
      audiodownload: 'https://prod-1.storage.jamendo.com/download/track/9/mp32/',
      audiodownload_allowed: true,
      license_ccurl: 'http://creativecommons.org/licenses/by/3.0/',
    });
    const [asset] = await pickedStockAssets(doc(), [pick({ provider: 'JAMENDO', provider_id: '9', kind: 'AUDIO', url: 'https://evil.example/forged.mp3' })]);
    expect(trackMock).toHaveBeenCalledWith('9');
    expect(importMock).toHaveBeenCalledWith(expect.objectContaining({ remoteUrl: 'https://prod-1.storage.jamendo.com/download/track/9/mp32/', fileName: 'jamendo-9' }));
    expect(asset).toMatchObject({ kind: 'AUDIO', name: 'Rally', duration_ms: 61_000, attribution: '"Rally" by Nets on Jamendo', provider_id: 'jamendo:9', width: 0 });
    expect(asset.licence).toContain('CC BY 3.0');
  });

  it('refuses a Jamendo track that is gone or whose licence forbids commercial use', async () => {
    trackMock.mockResolvedValueOnce(null);
    await expect(pickedStockAssets(doc(), [pick({ provider: 'JAMENDO', kind: 'AUDIO' })])).rejects.toMatchObject(BAD_INPUT);
    trackMock.mockResolvedValueOnce({ id: '9', audiodownload: 'https://x.jamendo.com/9', audiodownload_allowed: true, license_ccurl: 'http://creativecommons.org/licenses/by-nc/3.0/' });
    await expect(pickedStockAssets(doc(), [pick({ provider: 'JAMENDO', kind: 'AUDIO' })])).rejects.toMatchObject(BAD_INPUT);
    expect(importMock).not.toHaveBeenCalled();
  });

  it('skips what the reel already holds, and a pick listed twice, without importing it again', async () => {
    const added = await pickedStockAssets(doc([{ source: 'STOCK', kind: 'VIDEO', provider_id: 'pixabay:77' }]), [pick(), pick({ provider_id: '78' }), pick({ provider_id: '78' })]);
    expect(added.map((asset) => asset.provider_id)).toEqual(['pixabay:78']);
    expect(importMock).toHaveBeenCalledTimes(1);
  });

  it('keeps Pexels picks as pointers, exactly as before', async () => {
    const [asset] = await pickedStockAssets(doc(), [
      pick({ provider: null, provider_id: '5', kind: 'IMAGE', url: 'https://images.pexels.com/photos/5/large.jpeg', licence: 'Pexels License' }),
    ]);
    expect(asset).toMatchObject({ url: 'https://images.pexels.com/photos/5/large.jpeg', provider_id: '5' });
    expect(importMock).not.toHaveBeenCalled();
  });

  it('refuses more than six library imports at once, and a pick with no library id', async () => {
    const many = Array.from({ length: 7 }, (_, index) => pick({ provider_id: String(index) }));
    await expect(pickedStockAssets(doc(), many)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('at most 6') });
    await expect(pickedStockAssets(doc(), [pick({ provider_id: ' ' })])).rejects.toMatchObject(BAD_INPUT);
    expect(importMock).not.toHaveBeenCalled();
  });
});
