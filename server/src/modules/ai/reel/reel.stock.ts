import { isTrustedMediaUrl } from '@utils/url';
import { pexelsSearch, pexelsSearchVideos } from '@modules/platform/upload/upload.service';
import type { ReelAspect } from './reel.edit';
import type { IReelProject, ReelAsset, ReelAssetKind } from './reel.model';
import { badInput, kindOfMime, mimeFromUrl, shortId, str } from './reel.shared';

/**
 * Footage that is not in Drive: stock from Pexels, and files already in the
 * media store. A stock asset is a POINTER to the library's CDN with its
 * licence line — the file is never copied, so the credit the library asks for
 * travels with the reel and the renderer fetches from a host it already
 * trusts (see TRUSTED_MEDIA_HOSTS).
 */

export interface ReelMediaItem {
  id: string;
  kind: ReelAssetKind;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  duration_ms: number;
  licence: string;
  attribution: string;
  provider_id: string;
}

export interface ReelMediaPage {
  items: ReelMediaItem[];
  has_more: boolean;
}

export interface ReelStockAssetInput {
  provider_id: string;
  kind: ReelAssetKind;
  url: string;
  preview_url?: string | null;
  name: string;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  licence: string;
  attribution: string;
}

export interface ReelUploadInput {
  url: string;
  name: string;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
}

/** What Pexels asks in return; every stock asset carries it. */
export const PEXELS_LICENCE = 'Pexels License — free to use, no attribution required';
const PEXELS_HOST = /(^|\.)pexels\.com$/i;
const PAGE_SIZE = 24;
/** The longest side a reel frame needs; a bigger file is bandwidth, not quality. */
const MAX_VIDEO_SIDE = 1920;

const ORIENTATION: Record<ReelAspect, 'portrait' | 'square' | 'landscape'> = {
  PORTRAIT: 'portrait',
  SQUARE: 'square',
  LANDSCAPE: 'landscape',
};

const whole = (value: number | null | undefined): number => Math.max(0, Math.round(value ?? 0));

/** An https address on the stock library's own hosts — the only place a STOCK asset may point. */
export function isPexelsUrl(url: string): boolean {
  try {
    return isTrustedMediaUrl(url) && PEXELS_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

type PexelsPhoto = Awaited<ReturnType<typeof pexelsSearch>>['photos'][number];
type PexelsVideo = Awaited<ReturnType<typeof pexelsSearchVideos>>['videos'][number];

function photoItem(photo: PexelsPhoto): ReelMediaItem[] {
  const url = str(photo.src_large) || str(photo.src_original);
  if (!url) return [];
  return [
    {
      id: `photo-${photo.id}`,
      kind: 'IMAGE',
      url,
      preview_url: str(photo.src_medium) || url,
      width: whole(photo.width),
      height: whole(photo.height),
      duration_ms: 0,
      licence: PEXELS_LICENCE,
      attribution: `Photo by ${str(photo.photographer) || 'Pexels'} on Pexels`,
      provider_id: String(photo.id),
    },
  ];
}

/** The largest MP4 that still fits a reel frame, else the smallest there is. */
function bestFile(video: PexelsVideo): PexelsVideo['video_files'][number] | undefined {
  const files = [...video.video_files];
  files.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
  return files.find((file) => Math.max(file.width, file.height) <= MAX_VIDEO_SIDE) ?? files.at(-1);
}

function videoItem(video: PexelsVideo): ReelMediaItem[] {
  const file = bestFile(video);
  if (!file?.link) return [];
  return [
    {
      id: `video-${video.id}`,
      kind: 'VIDEO',
      url: file.link,
      preview_url: str(video.preview) || str(video.image),
      width: whole(file.width) || whole(video.width),
      height: whole(file.height) || whole(video.height),
      duration_ms: whole(video.duration) * 1000,
      licence: PEXELS_LICENCE,
      attribution: `Video by ${str(video.user_name) || 'Pexels'} on Pexels`,
      provider_id: String(video.id),
    },
  ];
}

/** Stock photos or videos for a reel, portrait unless asked otherwise. Never scraped: the library's own API, key kept server-side. */
export async function searchReelMedia(input: { query: string; kind: ReelAssetKind; orientation?: ReelAspect | null; page?: number | null; perPage?: number }): Promise<ReelMediaPage> {
  const query = str(input.query);
  if (!query) throw badInput('Say what to search the stock library for.');
  if (input.kind === 'AUDIO') throw badInput('The stock library has pictures and clips, not sound.');
  const opts = { query, page: Math.max(1, input.page ?? 1), perPage: input.perPage ?? PAGE_SIZE, orientation: ORIENTATION[input.orientation ?? 'PORTRAIT'] };
  if (input.kind === 'IMAGE') {
    const result = await pexelsSearch(opts);
    return { items: result.photos.flatMap(photoItem), has_more: result.next_page != null };
  }
  const result = await pexelsSearchVideos(opts);
  return { items: result.videos.flatMap(videoItem), has_more: result.next_page != null };
}

/** A stock item as the reel keeps it. */
export function stockAsset(item: ReelStockAssetInput): ReelAsset {
  const url = str(item.url);
  if (item.kind === 'AUDIO') throw badInput('A stock asset is a picture or a clip.');
  if (!isPexelsUrl(url)) throw badInput('A stock asset must come from the stock library — pick it with the media search.');
  const preview = str(item.preview_url);
  return {
    id: shortId(),
    kind: item.kind,
    source: 'STOCK',
    name: str(item.name).slice(0, 120) || (item.kind === 'VIDEO' ? 'stock clip' : 'stock photo'),
    mime_type: mimeFromUrl(url) || (item.kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
    drive_file_id: '',
    url,
    duration_ms: item.kind === 'VIDEO' ? whole(item.duration_ms) : 0,
    width: whole(item.width),
    height: whole(item.height),
    size_bytes: 0,
    licence: str(item.licence).slice(0, 200) || PEXELS_LICENCE,
    attribution: str(item.attribution).slice(0, 200),
    provider_id: str(item.provider_id).slice(0, 80),
    added_at: new Date(),
  };
}

/** A media-store item as the reel keeps it; its kind is read off the address. */
export function uploadAsset(upload: ReelUploadInput): ReelAsset {
  const url = str(upload.url);
  // Only what the media store itself served: an arbitrary address here would be
  // one the model, and then every viewer's browser, is told to fetch.
  if (!isTrustedMediaUrl(url)) throw badInput('An attached file did not come from the media store.');
  const mime_type = mimeFromUrl(url);
  const kind = kindOfMime(mime_type);
  if (!kind) throw badInput('An attached file is not a picture, a clip or a sound file the studio can play.');
  return {
    id: shortId(),
    kind,
    source: 'UPLOAD',
    name: str(upload.name).slice(0, 120) || kind.toLowerCase(),
    mime_type,
    drive_file_id: '',
    url,
    duration_ms: 0,
    width: whole(upload.width),
    height: whole(upload.height),
    size_bytes: whole(upload.size_bytes),
    added_at: new Date(),
    licence: '',
    attribution: '',
    provider_id: '',
  };
}

/** The stock items the reel does not already hold, by the library's id and kind. */
export function newStockAssets(doc: IReelProject, items: readonly ReelStockAssetInput[]): ReelAsset[] {
  const held = new Set(doc.assets.filter((asset) => asset.source === 'STOCK').map((asset) => `${asset.kind}:${asset.provider_id}`));
  const added: ReelAsset[] = [];
  for (const item of items) {
    const key = `${item.kind}:${str(item.provider_id)}`;
    if (held.has(key)) continue;
    held.add(key);
    added.push(stockAsset(item));
  }
  return added;
}
