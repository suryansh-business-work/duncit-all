import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { cacheGet, cacheSet } from '@config/redis';
import { outboundFetch } from '@utils/outboundFetch';
import type { ReelAspect } from './reel.edit';
import type { ReelAssetKind } from './reel.model';
import { cachedSearch, configError, upstreamError } from './reel.library';
import type { ReelMediaItem, ReelMediaPage } from './reel.stock';

/**
 * Pixabay stock photos and videos for Reel Studio, through Pixabay's own API
 * with the key kept server-side (Tech portal → Pixabay).
 *
 * Pixabay's terms shape this file: answers are cached for a day, the key may
 * make 100 requests a minute — the window it reports in its X-RateLimit
 * headers is remembered, and a search inside a spent window is refused here
 * rather than sent — and its files are never hotlinked: a pick is copied into
 * the media store (reel.library.ts).
 */

export const PIXABAY_LICENCE = 'Pixabay Content License — free to use, no attribution required';
const API = 'https://pixabay.com/api/';
const LIMIT_KEY = 'reel:pixabay:rate';
/** Pixabay refuses a longer query. */
const MAX_QUERY = 100;
/** The longest side a reel frame needs; a bigger file is bandwidth, not quality. */
const MAX_VIDEO_SIDE = 1920;

interface RateWindow {
  remaining: number;
  reset_at: number;
}

interface PixabayPhoto {
  id: number;
  user?: string;
  webformatURL?: string;
  largeImageURL?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface PixabayVideoFile {
  url?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
}

interface PixabayVideo {
  id: number;
  user?: string;
  duration?: number;
  videos?: Record<string, PixabayVideoFile | undefined>;
}

interface PixabayAnswer<T> {
  totalHits: number;
  hits: T[];
}

const whole = (value: number | null | undefined): number => Math.max(0, Math.round(value ?? 0));

/**
 * The key as Pixabay knows it. A Pixabay key never holds whitespace, but one
 * copied off its docs page can carry a space inside it ("58803161- b3b3…"),
 * which Pixabay refuses as an invalid key — so every space is dropped, not
 * only the ends.
 */
export const pixabayKey = (raw: string): string => [...raw].filter((ch) => ch.trim() !== '').join('');

const rateLimited = (seconds: number) =>
  new GraphQLError(`Pixabay's limit of 100 searches a minute is used up. Try again in ${seconds} seconds.`, {
    extensions: { code: 'RATE_LIMITED', retry_after_s: seconds },
  });

/** Refuse a search the key has no room left for, instead of spending a request to be told so. */
async function assertRoom(): Promise<void> {
  const window = await cacheGet<RateWindow>(LIMIT_KEY);
  if (window && window.remaining <= 0 && window.reset_at > Date.now()) {
    throw rateLimited(Math.ceil((window.reset_at - Date.now()) / 1000));
  }
}

/** Remember the window Pixabay reported, for the next search to check. */
async function rememberWindow(res: Response): Promise<void> {
  const remaining = Number(res.headers.get('x-ratelimit-remaining'));
  const resetS = Number(res.headers.get('x-ratelimit-reset'));
  if (!Number.isFinite(remaining) || !Number.isFinite(resetS)) return;
  await cacheSet(LIMIT_KEY, { remaining, reset_at: Date.now() + resetS * 1000 }, Math.max(1, Math.ceil(resetS)));
}

/** Whether a width and height have the shape asked for; unknown sizes pass. */
export function fitsAspect(width: number, height: number, aspect: ReelAspect): boolean {
  if (!width || !height) return true;
  const ratio = width / height;
  if (aspect === 'PORTRAIT') return ratio < 0.9;
  if (aspect === 'LANDSCAPE') return ratio > 1.1;
  return ratio >= 0.9 && ratio <= 1.1;
}

async function ask<T>(path: string, params: URLSearchParams): Promise<PixabayAnswer<T>> {
  const key = pixabayKey(await getRuntimeEnvValue('PIXABAY_API_KEY'));
  if (!key) throw configError('Pixabay', 'PIXABAY');
  return cachedSearch(`reel:pixabay:${path}?${params.toString()}`, async () => {
    await assertRoom();
    params.set('key', key);
    const res = await outboundFetch('Pixabay', `${API}${path}?${params.toString()}`);
    await rememberWindow(res);
    if (res.status === 429) throw rateLimited(Math.max(1, Number(res.headers.get('x-ratelimit-reset')) || 60));
    if (!res.ok) throw upstreamError('Pixabay', `${res.status} ${(await res.text().catch(() => '')).slice(0, 200) || res.statusText}`);
    const json = (await res.json()) as Partial<PixabayAnswer<T>>;
    return { totalHits: whole(json.totalHits), hits: Array.isArray(json.hits) ? json.hits : [] };
  });
}

function photoItem(photo: PixabayPhoto): ReelMediaItem[] {
  const url = photo.largeImageURL ?? '';
  if (!url) return [];
  return [
    {
      id: `pixabay-photo-${photo.id}`,
      kind: 'IMAGE',
      url,
      preview_url: photo.webformatURL || url,
      width: whole(photo.imageWidth),
      height: whole(photo.imageHeight),
      duration_ms: 0,
      licence: PIXABAY_LICENCE,
      attribution: `Image by ${photo.user || 'Pixabay'} on Pixabay`,
      provider_id: String(photo.id),
      provider: 'PIXABAY',
    },
  ];
}

/** The largest rendition that still fits a reel frame, else the smallest there is. */
function bestFile(video: PixabayVideo): PixabayVideoFile | undefined {
  const files = Object.values(video.videos ?? {}).filter((file): file is PixabayVideoFile => Boolean(file?.url));
  files.sort((a, b) => Math.max(whole(b.width), whole(b.height)) - Math.max(whole(a.width), whole(a.height)));
  return files.find((file) => Math.max(whole(file.width), whole(file.height)) <= MAX_VIDEO_SIDE) ?? files.at(-1);
}

function videoItem(video: PixabayVideo): ReelMediaItem[] {
  const file = bestFile(video);
  if (!file?.url) return [];
  const thumbnail = Object.values(video.videos ?? {}).find((rendition) => rendition?.thumbnail)?.thumbnail ?? '';
  return [
    {
      id: `pixabay-video-${video.id}`,
      kind: 'VIDEO',
      url: file.url,
      preview_url: thumbnail,
      width: whole(file.width),
      height: whole(file.height),
      duration_ms: whole(video.duration) * 1000,
      licence: PIXABAY_LICENCE,
      attribution: `Video by ${video.user || 'Pixabay'} on Pixabay`,
      provider_id: String(video.id),
      provider: 'PIXABAY',
    },
  ];
}

/** Pixabay photos or videos of the asked shape. Pixabay has no square filter, so shape is checked on our side too. */
export async function searchPixabay(input: { query: string; kind: ReelAssetKind; aspect: ReelAspect; page: number; perPage: number }): Promise<ReelMediaPage> {
  const params = new URLSearchParams({
    q: input.query.slice(0, MAX_QUERY),
    safesearch: 'true',
    page: String(input.page),
    per_page: String(Math.min(200, Math.max(3, input.perPage))),
  });
  const more = (total: number) => input.page * input.perPage < total;
  if (input.kind === 'IMAGE') {
    params.set('image_type', 'photo');
    params.set('orientation', { PORTRAIT: 'vertical', LANDSCAPE: 'horizontal', SQUARE: 'all' }[input.aspect]);
    const answer = await ask<PixabayPhoto>('', params);
    const items = answer.hits.flatMap(photoItem).filter((item) => fitsAspect(item.width, item.height, input.aspect));
    return { items, has_more: more(answer.totalHits) };
  }
  // Most Pixabay video is landscape and its API cannot filter by shape, so the
  // right shape is listed FIRST rather than the rest dropped: a page filtered
  // to portrait would often be empty, and a scene crops a clip to its frame.
  const answer = await ask<PixabayVideo>('videos/', params);
  const items = answer.hits.flatMap(videoItem);
  const fitting = items.filter((item) => fitsAspect(item.width, item.height, input.aspect));
  const rest = items.filter((item) => !fitsAspect(item.width, item.height, input.aspect));
  return { items: [...fitting, ...rest], has_more: more(answer.totalHits) };
}
