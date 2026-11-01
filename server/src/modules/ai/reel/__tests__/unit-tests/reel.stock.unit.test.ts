import { pexelsSearch, pexelsSearchVideos } from '@modules/platform/upload/upload.service';
import type { IReelProject, ReelAsset } from '../../reel.model';
import { PEXELS_LICENCE, isPexelsUrl, newStockAssets, searchReelMedia, stockAsset, uploadAsset, type ReelStockAssetInput } from '../../reel.stock';

jest.mock('@modules/platform/upload/upload.service', () => ({ pexelsSearch: jest.fn(), pexelsSearchVideos: jest.fn() }));

const photos = pexelsSearch as jest.Mock;
const videos = pexelsSearchVideos as jest.Mock;
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };
const PHOTO_URL = 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress';
const VIDEO_URL = 'https://videos.pexels.com/video-files/2/2-hd.mp4';

const stock = (over: Partial<ReelStockAssetInput> = {}): ReelStockAssetInput => ({
  provider_id: '1',
  kind: 'IMAGE',
  url: PHOTO_URL,
  preview_url: 'https://images.pexels.com/photos/1/tiny.jpeg',
  name: 'Dog in a park',
  width: 3000,
  height: 4500,
  licence: PEXELS_LICENCE,
  attribution: 'Photo by Asha on Pexels',
  ...over,
});

const photo = (id: number, over: Record<string, unknown> = {}) => ({
  id: String(id),
  width: 3000,
  height: 4500,
  photographer: 'Asha',
  src_original: `https://images.pexels.com/photos/${id}/original.jpeg`,
  src_large: `https://images.pexels.com/photos/${id}/large2x.jpeg`,
  src_medium: `https://images.pexels.com/photos/${id}/medium.jpeg`,
  ...over,
});

const file = (width: number, height: number, quality = 'hd') => ({ id: `${width}x${height}`, quality, width, height, link: `https://videos.pexels.com/video-files/9/${width}x${height}.mp4` });

describe('isPexelsUrl', () => {
  it.each([PHOTO_URL, VIDEO_URL, 'https://www.pexels.com/photo/1/'])('accepts %s', (url) => {
    expect(isPexelsUrl(url)).toBe(true);
  });

  it.each([
    'http://images.pexels.com/photos/1.jpeg',
    'https://ik.imagekit.io/duncit/p.jpeg',
    'https://images.unsplash.com/p.jpeg',
    'https://pexels.com.evil.example/p.jpeg',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isPexelsUrl(url)).toBe(false);
  });
});

describe('searchReelMedia', () => {
  it('lists photos with their licence line, credit and the sizes the picker and the reel need', async () => {
    photos.mockResolvedValue({ photos: [photo(1), photo(2, { photographer: '', src_large: '', src_medium: '' })], next_page: 'https://api.pexels.com/v1/search?page=2' });
    const page = await searchReelMedia({ query: ' dog park ', kind: 'IMAGE' });
    expect(photos).toHaveBeenCalledWith({ query: 'dog park', page: 1, perPage: 24, orientation: 'portrait' });
    expect(page.has_more).toBe(true);
    expect(page.items).toEqual([
      {
        id: 'photo-1',
        kind: 'IMAGE',
        url: 'https://images.pexels.com/photos/1/large2x.jpeg',
        preview_url: 'https://images.pexels.com/photos/1/medium.jpeg',
        width: 3000,
        height: 4500,
        duration_ms: 0,
        licence: PEXELS_LICENCE,
        attribution: 'Photo by Asha on Pexels',
        provider_id: '1',
      },
      // No large size: the original serves; no photographer: the library is credited.
      expect.objectContaining({ id: 'photo-2', url: 'https://images.pexels.com/photos/2/original.jpeg', preview_url: 'https://images.pexels.com/photos/2/original.jpeg', attribution: 'Photo by Pexels on Pexels' }),
    ]);
  });

  it('lists videos on the largest MP4 that still fits a reel frame, with their length in milliseconds', async () => {
    videos.mockResolvedValue({
      videos: [
        { id: '9', width: 2160, height: 3840, duration: 12, user_name: 'Ravi', preview: 'https://images.pexels.com/videos/9/preview.jpeg', image: '', video_files: [file(2160, 3840, 'uhd'), file(720, 1280, 'sd'), file(1080, 1920)] },
        { id: '10', width: 4096, height: 2160, duration: 5, user_name: '', preview: '', image: 'https://images.pexels.com/videos/10/image.jpeg', video_files: [file(4096, 2160, 'uhd'), file(2560, 1440, 'uhd')] },
        { id: '11', width: 1, height: 1, duration: 5, user_name: 'x', preview: '', image: '', video_files: [] },
      ],
      next_page: null,
    });
    const page = await searchReelMedia({ query: 'dogs', kind: 'VIDEO', orientation: 'LANDSCAPE', page: 3 });
    expect(videos).toHaveBeenCalledWith({ query: 'dogs', page: 3, perPage: 24, orientation: 'landscape' });
    expect(page.has_more).toBe(false);
    expect(page.items).toEqual([
      expect.objectContaining({ id: 'video-9', kind: 'VIDEO', url: 'https://videos.pexels.com/video-files/9/1080x1920.mp4', preview_url: 'https://images.pexels.com/videos/9/preview.jpeg', width: 1080, height: 1920, duration_ms: 12_000, attribution: 'Video by Ravi on Pexels', provider_id: '9' }),
      // Nothing fits: the smallest file there is.
      expect.objectContaining({ id: 'video-10', url: 'https://videos.pexels.com/video-files/9/2560x1440.mp4', preview_url: 'https://images.pexels.com/videos/10/image.jpeg', attribution: 'Video by Pexels on Pexels' }),
    ]);
  });

  it('refuses an empty query and a search for sound', async () => {
    await expect(searchReelMedia({ query: '  ', kind: 'IMAGE' })).rejects.toMatchObject(BAD_INPUT);
    await expect(searchReelMedia({ query: 'rain', kind: 'AUDIO' })).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('not sound') });
    expect(photos).not.toHaveBeenCalled();
    expect(videos).not.toHaveBeenCalled();
  });

  it('never asks for a page before the first', async () => {
    photos.mockResolvedValue({ photos: [], next_page: null });
    await searchReelMedia({ query: 'dogs', kind: 'IMAGE', page: -4, perPage: 1 });
    expect(photos).toHaveBeenCalledWith(expect.objectContaining({ page: 1, perPage: 1 }));
  });
});

describe('stockAsset', () => {
  it('keeps a photo by its library address with its licence, credit and id', () => {
    const asset = stockAsset(stock());
    expect(asset).toMatchObject({
      kind: 'IMAGE',
      source: 'STOCK',
      name: 'Dog in a park',
      mime_type: 'image/jpeg',
      drive_file_id: '',
      url: PHOTO_URL,
      duration_ms: 0,
      width: 3000,
      height: 4500,
      size_bytes: 0,
      licence: PEXELS_LICENCE,
      attribution: 'Photo by Asha on Pexels',
      provider_id: '1',
    });
    expect(asset.id).toHaveLength(8);
    expect(asset.added_at).toBeInstanceOf(Date);
  });

  it('keeps a clip’s length, and names a nameless item for what it is', () => {
    expect(stockAsset(stock({ kind: 'VIDEO', url: VIDEO_URL, duration_ms: 12_400.6, name: ' ' }))).toMatchObject({ kind: 'VIDEO', mime_type: 'video/mp4', duration_ms: 12_401, name: 'stock clip' });
    expect(stockAsset(stock({ name: '', licence: ' ' }))).toMatchObject({ name: 'stock photo', licence: PEXELS_LICENCE });
  });

  it('refuses a sound file and anything not on the library’s hosts', () => {
    expect(() => stockAsset(stock({ kind: 'AUDIO' }))).toThrow('picture or a clip');
    expect(() => stockAsset(stock({ url: 'https://ik.imagekit.io/duncit/p.jpeg' }))).toThrow('stock library');
    expect(() => stockAsset(stock({ url: 'http://images.pexels.com/p.jpeg' }))).toThrow('stock library');
  });
});

describe('uploadAsset', () => {
  it.each([
    ['https://ik.imagekit.io/duncit/clip.MP4?tr=orig-true', 'VIDEO', 'video/mp4'],
    ['https://ik.imagekit.io/duncit/poster.png', 'IMAGE', 'image/png'],
    ['https://ik.imagekit.io/duncit/bed.mp3', 'AUDIO', 'audio/mpeg'],
  ])('reads the kind off %s', (url, kind, mime_type) => {
    expect(uploadAsset({ url, name: 'f', width: 100.4, height: -1, size_bytes: 2048 })).toMatchObject({ kind, mime_type, source: 'UPLOAD', url, width: 100, height: 0, size_bytes: 2048, licence: '', attribution: '', provider_id: '' });
  });

  it('names a nameless file by its kind', () => {
    expect(uploadAsset({ url: 'https://ik.imagekit.io/duncit/clip.mov', name: '  ' }).name).toBe('video');
  });

  it('refuses a file from elsewhere, and one whose address says nothing it can play', () => {
    expect(() => uploadAsset({ url: 'https://evil.example/clip.mp4', name: 'c' })).toThrow('media store');
    expect(() => uploadAsset({ url: 'https://ik.imagekit.io/duncit/notes.pdf', name: 'n' })).toThrow('not a picture, a clip or a sound file the studio can play');
    expect(() => uploadAsset({ url: 'https://ik.imagekit.io/duncit/noext', name: 'n' })).toThrow('not a picture, a clip or a sound file the studio can play');
  });
});

describe('newStockAssets', () => {
  const held = (over: Partial<ReelAsset>): ReelAsset => ({ ...stockAsset(stock()), ...over });
  const project = (assets: ReelAsset[]) => ({ assets }) as unknown as IReelProject;

  it('skips what the reel already holds — by the library’s id and kind — and the same item sent twice', () => {
    const doc = project([held({ provider_id: '1', kind: 'IMAGE' }), held({ provider_id: '2', kind: 'VIDEO', source: 'STOCK' })]);
    const added = newStockAssets(doc, [stock({ provider_id: '1' }), stock({ provider_id: '2' }), stock({ provider_id: '3' }), stock({ provider_id: '3' })]);
    expect(added.map((asset) => asset.provider_id)).toEqual(['2', '3']);
  });

  it('only counts stock assets as held: an upload with an empty provider id blocks nothing', () => {
    const doc = project([held({ source: 'UPLOAD', provider_id: '' })]);
    expect(newStockAssets(doc, [stock({ provider_id: '' })])).toHaveLength(1);
  });
});
