import { parseProps } from './segments';

/**
 * `/__block/<key>?props=<json>&origin=<editor origin>` — one live block drawn
 * on its own, for the Website portal's designer, which cannot draw a live
 * block itself (the reel slider, the earn showcase… are this renderer's
 * components). The frame reports its height to `origin` so the designer can
 * size it.
 *
 * Only answered inside a frame: the props are free text from the URL, and a
 * page of the site's domain showing made-up words would be a phishing page.
 */
export const BLOCK_FRAME_PREFIX = '/__block/';

const BLOCK_KEY = /^[a-z0-9-]+$/;

export interface BlockFrame {
  block: string;
  props: Record<string, unknown>;
  /** Where the height is posted: the designer's origin, or null to post nowhere. */
  origin: string | null;
}

/** An http(s) origin, exactly — anything else is no target at all. */
function originOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === raw ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The block a request asks for: null when the path is not a block frame,
 * 'refused' when it is but was not loaded as a frame or names no block.
 */
export function blockFrameRequest(path: string, url: URL, request: Request): BlockFrame | 'refused' | null {
  if (!path.startsWith(BLOCK_FRAME_PREFIX)) return null;
  const block = path.slice(BLOCK_FRAME_PREFIX.length);
  if (!BLOCK_KEY.test(block) || request.headers.get('sec-fetch-dest') !== 'iframe') return 'refused';
  return { block, props: parseProps(url.searchParams.get('props') ?? undefined), origin: originOf(url.searchParams.get('origin')) };
}
