import { DIGITS } from '@duncit/regex';
import { badInput, configError, notFound, upstreamError } from '../utils/errors';
import { cleanText, wholeNumber } from '../utils/validate';
import { envEntryService, readString } from './envEntry.service';
import { uploadRemoteImage } from './upload.service';

const PEXELS_API = 'https://api.pexels.com/v1';
const TIMEOUT_MS = 10_000;
const PER_PAGE = 24;
const MAX_PAGE = 50;
const MAX_ID_LENGTH = 12;
/** Pexels allows 200 calls an hour per key, shared by every host: a repeated search answers from here. */
const CACHE_TTL_MS = 30 * 60_000;
const CACHE_MAX = 300;

export const PICTURE_ORIENTATIONS = ['LANDSCAPE', 'PORTRAIT', 'SQUARE'] as const;
export type PictureOrientation = (typeof PICTURE_ORIENTATIONS)[number];

interface PexelsApiPhoto {
  id: number;
  width: number;
  height: number;
  alt?: string | null;
  avg_color?: string | null;
  photographer: string;
  photographer_url: string;
  src: { medium: string; large2x: string };
}

interface PexelsApiPage {
  photos: PexelsApiPhoto[];
  next_page?: string;
}

export interface LitePexelsPhoto {
  id: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  avg_color: string | null;
  thumb_url: string;
  width: number;
  height: number;
}

export interface LitePexelsPage {
  photos: LitePexelsPhoto[];
  page: number;
  has_more: boolean;
}

export interface PexelsSearchInput {
  query?: string | null;
  orientation?: PictureOrientation | null;
  page?: number | null;
}

const cache = new Map<string, { at: number; value: LitePexelsPage }>();

function remember(key: string, value: LitePexelsPage): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

/** Tests start from an empty cache. */
export function clearPexelsCache(): void {
  cache.clear();
}

/** The active Pexels key, or '' — the picker then offers uploads only. */
export async function activePexelsKey(): Promise<string> {
  return readString(await envEntryService.activeConfig('PEXELS'), 'api_key');
}

async function requireKey(): Promise<string> {
  const key = await activePexelsKey();
  if (!key) throw configError('Stock photos are not configured yet (Console → Environment → Pexels).');
  return key;
}

async function pexelsGet<T>(path: string, key: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PEXELS_API}${path}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw upstreamError(`Pexels could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (res.status === 404) throw notFound('That photo');
  if (!res.ok) throw upstreamError(`Pexels refused the request (HTTP ${res.status})`);
  return (await res.json()) as T;
}

const toPhoto = (photo: PexelsApiPhoto): LitePexelsPhoto => ({
  id: String(photo.id),
  alt: photo.alt?.trim() ?? '',
  photographer: photo.photographer,
  photographer_url: photo.photographer_url,
  avg_color: photo.avg_color ?? null,
  thumb_url: photo.src.medium,
  width: photo.width,
  height: photo.height,
});

/**
 * One page of photos: a search when there is a query (optionally leaning one
 * way), otherwise Pexels' curated picks. Orientation only narrows a search;
 * the curated list has no such filter.
 */
export async function searchPexels(input: PexelsSearchInput): Promise<LitePexelsPage> {
  const query = cleanText(input.query ?? '', 100, 'Search');
  const page = wholeNumber(input.page ?? 1, 'Page', { min: 1, max: MAX_PAGE });
  const orientation = query && input.orientation ? input.orientation.toLowerCase() : '';
  const cacheKey = `${query.toLowerCase()}|${orientation}|${page}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const key = await requireKey();
  const params = new URLSearchParams({ per_page: String(PER_PAGE), page: String(page) });
  if (query) params.set('query', query);
  if (orientation) params.set('orientation', orientation);
  const body = await pexelsGet<PexelsApiPage>(`/${query ? 'search' : 'curated'}?${params.toString()}`, key);
  const value: LitePexelsPage = { photos: (body.photos ?? []).map(toPhoto), page, has_more: Boolean(body.next_page) && page < MAX_PAGE };
  remember(cacheKey, value);
  return value;
}

/**
 * Copy a chosen Pexels photo to ImageKit and answer its URL. Only an id is
 * taken from the browser: the photo's address comes from Pexels itself, so no
 * arbitrary link can be pushed into the image store.
 */
export async function importPexelsPhoto(id: string): Promise<{ url: string }> {
  const text = String(id ?? '').trim();
  if (!DIGITS.test(text) || text.length > MAX_ID_LENGTH) throw badInput('Choose a photo from the search results');
  const key = await requireKey();
  const photo = await pexelsGet<PexelsApiPhoto>(`/photos/${text}`, key);
  const result = await uploadRemoteImage(photo.src.large2x, `pexels-${photo.id}.jpg`, 'pexels');
  return { url: result.url };
}

/** Prove a Pexels key with the smallest call there is. */
export async function probePexels(apiKey: string): Promise<{ ok: boolean; message: string }> {
  if (!apiKey) return { ok: false, message: 'The API key is required' };
  try {
    await pexelsGet<PexelsApiPage>('/curated?per_page=1', apiKey);
    return { ok: true, message: 'Pexels accepted this key' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
