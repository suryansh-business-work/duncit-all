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
 * The URL to hand a video player.
 *
 * Left alone: a non-ImageKit address (a Pexels clip, a local file), and one
 * that already carries a `tr=` transformation, which somebody asked for on
 * purpose. Idempotent, so a URL that was stored with the flag survives a
 * second pass unchanged.
 */
export function videoSourceUrl(url?: string | null): string {
  const raw = (url ?? '').trim();
  if (!IMAGEKIT_URL.test(raw)) return raw;
  const hashAt = raw.indexOf('#');
  const address = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : raw.slice(hashAt);
  if (/[?&]tr=/i.test(address)) return raw;
  const separator = address.includes('?') ? '&' : '?';
  return `${address}${separator}${ORIGINAL}${hash}`;
}
