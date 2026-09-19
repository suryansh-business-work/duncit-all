import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * A listing image, fetched from where the portal uploaded it (ImageKit) so it
 * can be handed to a store. Both stores want the bytes and a file name with
 * the right extension; Apple also wants an MD5 to prove the upload arrived
 * whole.
 */
export interface StoreAsset {
  fileName: string;
  bytes: Buffer;
  md5: string;
  contentType: string;
}

const FETCH_TIMEOUT_MS = 60_000;

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

/** `screenshot-3.png` from the URL, or from the content type when the URL has no extension. */
function assetFileName(url: string, contentType: string, index: number): string {
  const base = path.posix.basename(new URL(url).pathname).replaceAll(/[^\w.-]/g, '_');
  if (path.extname(base)) return base;
  return `${base || `image-${index + 1}`}${EXTENSION_BY_TYPE[contentType] ?? '.png'}`;
}

/** Fetch one image. Refuses anything but PNG or JPEG — the stores would too, later and less clearly. */
export async function fetchStoreAsset(url: string, index = 0): Promise<StoreAsset> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Could not fetch listing image (HTTP ${res.status}): ${url}`);
  const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
  if (!EXTENSION_BY_TYPE[contentType]) {
    throw new Error(`Listing image is ${contentType || 'of unknown type'}, not PNG or JPEG: ${url}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    fileName: assetFileName(url, contentType, index),
    bytes,
    md5: createHash('md5').update(bytes).digest('hex'),
    contentType,
  };
}

/** All of a set's images, in listing order. */
export const fetchStoreAssets = (urls: string[]): Promise<StoreAsset[]> =>
  Promise.all(urls.map((url, index) => fetchStoreAsset(url, index)));
