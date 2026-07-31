/**
 * Short-link attribution capture — the one copy every web surface runs at root.
 *
 * A duncit.com short link redirects to its destination carrying two markers:
 *   `dlc` — the id of the click the API just recorded (the normal path), and
 *   `dl`  — the short code itself, which survives even when the redirect chain
 *           was skipped (someone shared the tagged URL directly, an app opened
 *           the destination without the hop, the resolver was unreachable).
 *
 * On page load this reports the visit to `GET <server>/r/v`, which verifies the
 * marker against the database — an unknown code or click id records nothing —
 * and answers with the click id the visit now belongs to. That is what makes
 * tracking survive a broken chain: the DESTINATION recognises the link, not
 * only the redirect.
 *
 * FIRST TOUCH WINS locally. A visitor who arrives from an Instagram link and
 * later returns through a WhatsApp one keeps the first attribution — otherwise
 * the last link before checkout would take credit for work the first one did.
 * The second link's own landing is still reported, so its numbers stay honest.
 *
 * TWIN: app/mobile-app/src/lib/short-link-attribution.ts mirrors this for the
 * native app (AsyncStorage instead of localStorage) — change one, change both.
 */
export const SHORT_LINK_CLICK_KEY = 'duncit_short_link_click';

export interface ShortLinkParams {
  code: string | null;
  clickId: string | null;
}

/** The short-link markers a query string carries, if any. */
export function parseShortLinkParams(search: string): ShortLinkParams {
  const params = new URLSearchParams(search);
  return { code: params.get('dl'), clickId: params.get('dlc') };
}

/** The click this browser is attributed to, from an earlier visit. */
export function storedShortLinkClickId(): string | null {
  try {
    return globalThis.localStorage.getItem(SHORT_LINK_CLICK_KEY);
  } catch {
    // Private mode / storage disabled: attribution is simply unavailable.
    return null;
  }
}

function store(clickId: string): void {
  try {
    globalThis.localStorage.setItem(SHORT_LINK_CLICK_KEY, clickId);
  } catch {
    // Nothing to do — the visit was still reported against this page load.
  }
}

export interface CaptureOptions {
  /** window.location.search of the landing page. */
  search: string;
  /** document.referrer — meaningful on direct tagged-URL visits, where it
   * still names the real source (Instagram, a chat app) rather than our own
   * redirect hop. */
  referrer: string;
  /** API origin, e.g. https://server.duncit.com */
  serverUrl: string;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

/**
 * Report this landing to the API and remember which click the browser belongs
 * to. Resolves to that click id (first-touch), or null when the visitor never
 * came through a link. Never throws — attribution is not worth breaking a
 * page over.
 */
export async function captureShortLinkAttribution(options: CaptureOptions): Promise<string | null> {
  const { code, clickId } = parseShortLinkParams(options.search);
  const existing = storedShortLinkClickId();
  if (!code && !clickId) return existing;

  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (!fetchFn) return existing;

  const params = new URLSearchParams();
  // The click id is the stronger marker — it names the exact click. The code
  // alone still identifies the link, and the server mints a click for it.
  if (clickId) params.set('dlc', clickId);
  else if (code) params.set('dl', code);
  if (options.referrer) params.set('dr', options.referrer);

  try {
    const response = await fetchFn(
      `${options.serverUrl.replace(/\/+$/, '')}/r/v?${params.toString()}`,
    );
    const body = await response.json();
    const resolved: string | null = body?.click_id ?? null;
    if (existing) return existing;
    if (resolved) store(resolved);
    return resolved;
  } catch {
    // Offline, opaque response, or the API is down — the visit is lost, the
    // page is not.
    return existing;
  }
}
