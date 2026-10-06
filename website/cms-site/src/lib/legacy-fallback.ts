/**
 * The hand-built site behind a CMS site, for whatever the CMS does not have.
 *
 * When duncit.com moved to the CMS, its old server still answered things that
 * are not pages: short links (duncit.com/aB3xY9Zq → a 302 to the shared pod,
 * club or profile), policies published after the migration, and per-post share
 * cards. So a path the CMS answers with 404 is handed to that site's old
 * container, untouched, and its answer is passed back — redirects included.
 *
 * Configured per legacy site (the CMS site's `legacy_site`):
 *   LEGACY_ORIGIN_MAIN=http://website:2000   (and _PARTNERS, _ADS, _EARNWITH)
 * Unset means no fallback: the CMS 404 stands.
 */

/** Hop-by-hop or rewritten by this server; never copied from the old site's answer. */
const DROPPED_HEADERS = new Set(['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length']);

/** A dead old container must not hold the page: the CMS 404 is shown instead. */
const FALLBACK_TIMEOUT_MS = 8000;

export function legacyOrigin(legacySite: string | null | undefined): string | null {
  if (!legacySite) return null;
  const origin = process.env[`LEGACY_ORIGIN_${legacySite}`]?.trim();
  if (!origin) return null;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

/** The old site's answer for this request, or null when it has none either (or is down). */
export async function fromLegacy(origin: string, request: Request): Promise<Response | null> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const headers = new Headers();
  for (const name of ['accept', 'accept-language', 'user-agent', 'referer', 'cookie']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', ''));
  try {
    const answer = await fetch(`${origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
    });
    if (answer.status === 404) return null;
    const out = new Headers();
    answer.headers.forEach((value, name) => {
      if (!DROPPED_HEADERS.has(name)) out.set(name, value);
    });
    out.set('x-served-by', 'legacy');
    return new Response(request.method === 'HEAD' ? null : await answer.arrayBuffer(), { status: answer.status, headers: out });
  } catch (error) {
    console.error('[cms-site] legacy fallback failed', { origin, path: url.pathname, reason: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
