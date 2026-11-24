import { GraphQLError } from 'graphql';
import { cacheGet, cacheSet } from '@config/redis';
import { importRemoteMedia } from '@modules/platform/upload/upload.service';
import type { ReelAssetKind } from './reel.model';

/**
 * What the stock libraries share: which one a search or a pick names, how
 * their answers are cached, and how a picked file is copied into the media
 * store. Pexels files stay pointers to Pexels' CDN (see reel.stock.ts);
 * Pixabay and Jamendo files are IMPORTED, because Pixabay does not allow
 * hotlinking and neither promises the CORS headers the in-browser exporter
 * needs to read a file.
 */

export const REEL_STOCK_PROVIDERS = ['PEXELS', 'PIXABAY', 'JAMENDO'] as const;
export type ReelStockProvider = (typeof REEL_STOCK_PROVIDERS)[number];

/** A day: Pixabay asks for every answer to be cached this long, and stock does not change faster. */
const SEARCH_CACHE_SECONDS = 24 * 60 * 60;
/** Where a reel's imported stock lands in the media store. */
const IMPORT_FOLDER = '/reels/stock';

export const configError = (library: string, category: string) =>
  new GraphQLError(`${library} is not configured. Add its key in the Tech portal (${category}).`, {
    extensions: { code: 'CONFIG_ERROR', env_category: category },
  });

export const upstreamError = (library: string, detail: string) =>
  new GraphQLError(`${library} search failed: ${detail}`, { extensions: { code: 'UPSTREAM_ERROR' } });

/** The library's own answer for a search, from the cache when it was asked in the last day. */
export async function cachedSearch<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit) return hit;
  const value = await load();
  await cacheSet(key, value, SEARCH_CACHE_SECONDS);
  return value;
}

/** Copy a library file into the media store and hand back its address there. */
export async function importLibraryFile(url: string, provider: ReelStockProvider, providerId: string): Promise<string> {
  const uploaded = await importRemoteMedia({
    remoteUrl: url,
    folder: IMPORT_FOLDER,
    fileName: `${provider.toLowerCase()}-${providerId.replace(/\W/g, '_')}`,
    tags: ['reel', provider.toLowerCase()],
    surface: 'PORTALS',
  });
  return uploaded.url;
}

/** The provider a pick names; old clients send none, and everything they picked came from Pexels. */
export const providerOf = (provider: ReelStockProvider | null | undefined): ReelStockProvider => provider ?? 'PEXELS';

/** Music comes only from Jamendo, and Jamendo has only music. */
export function assertKindFits(provider: ReelStockProvider, kind: ReelAssetKind): string | null {
  if (provider === 'JAMENDO' && kind !== 'AUDIO') return 'Jamendo has music only — search it for AUDIO.';
  if (provider !== 'JAMENDO' && kind === 'AUDIO') return 'Search Jamendo for music; the picture libraries have no sound.';
  return null;
}
