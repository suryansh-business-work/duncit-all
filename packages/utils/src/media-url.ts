/**
 * How a stored video is asked for, shared by every surface that plays one
 * (rules 27/40).
 *
 * ImageKit re-encodes a video on delivery unless the request asks for the
 * original, and that re-encode is metered. Once the account's video
 * transformation allowance is spent EVERY plain video URL answers
 * `403 ELIMIT — Video transformations limit exceeded`, so the player is handed
 * nothing and the slide sits black — which is exactly what a story video did.
 * Nothing about the clip is wrong, and no error the app can see is raised:
 * the bytes simply never arrive.
 *
 * A duncit video is already encoded by the server's own FFmpeg pass (h264,
 * faststart, capped height) before it is ever stored, so ImageKit's second
 * encode buys nothing and only spends the allowance that breaks playback.
 * `tr=orig-true` asks for the stored file untouched: it is not a
 * transformation, so it neither costs an allowance nor fails once they are
 * gone.
 */

/** An address served by our ImageKit CDN — nothing else is rewritten. */
const IMAGEKIT_URL = /^https?:\/\/([^/?#]*\.)?imagekit\.io(:\d+)?[/?#]/i;

/** ImageKit's "hand back the stored file" flag. */
const ORIGINAL = 'tr=orig-true';

/**
 * `url` with one ImageKit `tr=` parameter appended, before any fragment.
 *
 * Left alone: a non-ImageKit address (a Pexels clip, a local file), and one
 * that already carries a `tr=` transformation, which somebody asked for on
 * purpose. Idempotent, so a URL stored with a transformation survives a
 * second pass unchanged.
 */
function withImageKitTransform(url: string | null | undefined, transform: string): string {
  const raw = (url ?? '').trim();
  if (!IMAGEKIT_URL.test(raw)) return raw;
  const hashAt = raw.indexOf('#');
  const address = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : raw.slice(hashAt);
  if (/[?&]tr=/i.test(address)) return raw;
  const separator = address.includes('?') ? '&' : '?';
  return `${address}${separator}${transform}${hash}`;
}

/** The URL to hand a video player: the stored file, never a metered re-encode. */
export function videoSourceUrl(url?: string | null): string {
  return withImageKitTransform(url, ORIGINAL);
}

/**
 * The URL to paint an image `width` pixels wide: our ImageKit addresses ask for
 * a copy resized to that width (the aspect ratio is kept, and ImageKit still
 * picks WebP/AVIF for the browser), everything else is unchanged.
 *
 * A stored photo is often several megapixels, while a card is a few hundred
 * pixels wide — the full file was 3-4x the bytes, and the decode, a card can
 * show. Image resizes are not the metered video re-encode above. Pass the
 * largest width the image renders at, device pixels included.
 */
export function imageSourceUrl(url: string | null | undefined, width: number): string {
  return withImageKitTransform(url, `tr=w-${Math.round(width)}`);
}

/**
 * Which addresses name a video, shared by every surface that has to decide
 * whether a stored media URL plays or paints (rules 27/34/40).
 *
 * Eight copies of `/\.(mp4|mov|webm)$/i` had drifted across the create-pod
 * forms, the club form and the portals, and every one of them answered "image"
 * for a video the moment its URL carried a query string — which an ImageKit
 * address does as soon as anything is appended to it, `tr=orig-true` included.
 * A cover video typed `IMAGE` is then handed to an `<img>`, and the tile is
 * simply blank: no error, no player, nothing to see. The container list also
 * matches what the server already accepts on upload, so a `.m4v` or a `.mkv`
 * can no longer be stored as a picture it will never render as.
 */
const VIDEO_URL_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp|ts|flv|wmv|mpe?g)(\?|#|$)/i;

/** True when the address names a video file, query string or not. */
export function isVideoUrl(url?: string | null): boolean {
  return VIDEO_URL_RE.test((url ?? '').trim());
}

/** The media type an uploaded URL carries when nobody said which it is. */
export function mediaTypeForUrl(url?: string | null): 'IMAGE' | 'VIDEO' {
  return isVideoUrl(url) ? 'VIDEO' : 'IMAGE';
}

/** A stored media row: a URL, and the type the writer recorded for it. */
export interface StoredMedia {
  url: string;
  type?: string | null;
}

/**
 * True when a stored row should render as a playable video.
 *
 * The recorded `type` wins — an admin who typed one is the authority — and the
 * URL answers for the rows written before the type was recorded correctly, so
 * the videos already sitting in the database play without a migration.
 */
export function isVideoMedia(media?: Readonly<StoredMedia> | null): boolean {
  if (!media) return false;
  if ((media.type ?? '').toUpperCase() === 'VIDEO') return true;
  return isVideoUrl(media.url);
}

/**
 * The first still in a media list — what a card, a rail tile or an avatar
 * should show.
 *
 * A cover whose first item is a video used to be dropped straight into an
 * `<img>`/`<Image>`, which paints nothing at all. Falling through to the next
 * item means a video-first cover still shows the pod or club rather than a
 * blank card; a cover that is ONLY video has no still to offer and answers
 * undefined so the caller draws its own placeholder.
 */
export function coverImageUrl(
  media?: readonly Readonly<StoredMedia>[] | null,
): string | undefined {
  return media?.find((item) => !!item?.url && !isVideoMedia(item))?.url;
}
