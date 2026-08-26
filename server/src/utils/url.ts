/**
 * URL shaping the whole server shares.
 *
 * Every base here is admin-configured and almost every mail body pastes a path
 * onto one, so "the base, minus its trailing slashes" is asked for in two dozen
 * places. Most of them match it with `/\/+$/`, which backtracks super-linearly
 * on a pathological input (Sonar S8786) — and three separate files had already
 * hand-written the walked version to avoid exactly that, each with its own name
 * and its own comment explaining the same thing. This is that helper, once
 * (rule 40).
 */
export function trimTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** A configured base with `path` under it, with exactly one slash between. */
export function joinUrl(base: string, path: string): string {
  const root = trimTrailingSlash(base);
  if (!path) return root;
  return path.startsWith('/') ? `${root}${path}` : `${root}/${path}`;
}

/** An address served by our ImageKit CDN — nothing else is rewritten. */
const IMAGEKIT_URL = /^https?:\/\/([^/?#]*\.)?imagekit\.io(:\d+)?[/?#]/i;

/**
 * The URL to fetch a stored video from.
 *
 * ImageKit re-encodes a video on delivery unless the request asks for the
 * original, and that re-encode is metered: once the account's video
 * transformation allowance is spent every plain video URL answers
 * `403 ELIMIT`, and the compression pass downloads nothing. Our videos are
 * already encoded by that pass, so the second encode buys nothing —
 * `tr=orig-true` asks for the stored file untouched, which is not a
 * transformation and so never runs out.
 *
 * The client half of this lives in `@duncit/utils` (`videoSourceUrl`); the
 * server keeps its own copy because `server/src` imports no `@duncit/*`.
 */
export function videoSourceUrl(url: string): string {
  const raw = url.trim();
  if (!IMAGEKIT_URL.test(raw)) return raw;
  const hashAt = raw.indexOf('#');
  const address = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : raw.slice(hashAt);
  // An explicit transformation is somebody's deliberate choice — leave it.
  if (/[?&]tr=/i.test(address)) return raw;
  const separator = address.includes('?') ? '&' : '?';
  return `${address}${separator}tr=orig-true${hash}`;
}
