import type { ReelAsset, ReelSpec } from '@duncit/gql-types';

/** The assets the edit actually draws or plays — footage, overlays and music. */
export function assetIdsInUse(spec: ReelSpec): Set<string> {
  const ids = new Set<string>();
  for (const scene of spec.scenes) {
    if (scene.asset_id) ids.add(scene.asset_id);
    for (const overlay of scene.overlays ?? []) ids.add(overlay.asset_id);
  }
  if (spec.music) ids.add(spec.music.asset_id);
  return ids;
}

/** A download that failed, named by the file so the operator knows which one. */
export class AssetDownloadError extends Error {
  constructor(readonly assetName: string) {
    super(assetName);
    this.name = 'AssetDownloadError';
  }
}

export interface LocalAssets {
  /** The project's assets, with every used one pointing at its in-tab copy. */
  assets: ReelAsset[];
  /** Frees the in-tab copies. Call it once the render is over, however it ended. */
  release: () => void;
}

/**
 * Downloads every asset the reel uses into this tab before a frame is drawn.
 *
 * Rendering straight from the Drive relay made each frame wait on the network:
 * the renderer seeks by ranged requests, every one a round trip through the API
 * server to Google Drive, and one slow answer — a throttled background tab, a
 * congested link — held a frame past Remotion's 28s delayRender limit and failed
 * the export ("Extracting frame at time 0.2 … was not cleared"). From local
 * copies the render reads memory only, and runs about twice as fast.
 *
 * One file at a time, so the progress is honest and Drive serves one stream.
 */
export async function downloadReelAssets(
  assets: readonly ReelAsset[],
  spec: ReelSpec,
  signal: AbortSignal,
  onProgress: (share: number) => void
): Promise<LocalAssets> {
  const used = assetIdsInUse(spec);
  const wanted = assets.filter((asset) => used.has(asset.id));
  const urls = new Map<string, string>();
  const release = () => {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
  };
  try {
    for (const asset of wanted) {
      const response = await fetch(asset.url, { signal });
      if (!response.ok) throw new AssetDownloadError(asset.name);
      urls.set(asset.id, URL.createObjectURL(await response.blob()));
      onProgress(urls.size / wanted.length);
    }
  } catch (error) {
    release();
    throw error;
  }
  return {
    assets: assets.map((asset) => {
      const url = urls.get(asset.id);
      return url ? { ...asset, url } : asset;
    }),
    release,
  };
}
