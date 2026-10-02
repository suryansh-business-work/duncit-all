import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReelAsset, ReelSpec } from '@duncit/gql-types';
import { AssetDownloadError, assetIdsInUse, downloadReelAssets } from '../../src/pages/reels/studio/export/localAssets';

const asset = (id: string): ReelAsset => ({ id, name: `${id}.mp4`, url: `https://server.duncit.com/reels/media/${id}` }) as ReelAsset;

const spec = {
  scenes: [
    { asset_id: 'clip', overlays: [{ asset_id: 'logo' }] },
    { asset_id: '', overlays: [] },
    { asset_id: 'clip' },
  ],
  music: { asset_id: 'song' },
} as unknown as ReelSpec;

let fetchSpy: ReturnType<typeof vi.spyOn>;
let made = 0;

beforeEach(() => {
  made = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:copy-${++made}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Blob(['bytes'])));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('assetIdsInUse', () => {
  it('collects footage, overlays and music once each, skipping colour cards', () => {
    expect([...assetIdsInUse(spec)]).toEqual(['clip', 'logo', 'song']);
    expect([...assetIdsInUse({ scenes: [], music: null } as unknown as ReelSpec)]).toEqual([]);
  });
});

describe('downloadReelAssets', () => {
  it('downloads only what the reel uses, reports progress and points those assets at the copies', async () => {
    const progress: number[] = [];
    const local = await downloadReelAssets(
      [asset('clip'), asset('unused'), asset('logo'), asset('song')],
      spec,
      new AbortController().signal,
      (share) => progress.push(share)
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(progress).toEqual([1 / 3, 2 / 3, 1]);
    expect(local.assets.map((a) => a.url)).toEqual([
      'blob:copy-1',
      'https://server.duncit.com/reels/media/unused',
      'blob:copy-2',
      'blob:copy-3',
    ]);
    local.release();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  });

  it('names a file Drive would not serve, and frees what it already copied', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(new Blob(['ok']))).mockResolvedValueOnce(new Response('x', { status: 403 }));
    const download = downloadReelAssets([asset('clip'), asset('logo')], spec, new AbortController().signal, () => undefined);
    await expect(download).rejects.toEqual(new AssetDownloadError('logo.mp4'));
    await expect(download).rejects.toMatchObject({ name: 'AssetDownloadError', assetName: 'logo.mp4' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:copy-1');
  });
});
