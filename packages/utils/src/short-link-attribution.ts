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
export const SHORT_LINK_UTM_KEY = 'duncit_short_link_utm';

/** The campaign tags worth carrying across surfaces. */
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

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
  // The utm tags persist independently of the markers: a landing tagged by an
  // external campaign (no short link involved) still deserves to keep its
  // campaign identity across the hops the visitor makes afterwards.
  rememberUtmParams(options.search);
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

  // Linear strip, not /\/+$/ — that quantifier backtracks super-linearly.
  let base = options.serverUrl;
  while (base.endsWith('/')) base = base.slice(0, -1);

  try {
    const response = await fetchFn(`${base}/r/v?${params.toString()}`);
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

/** Remember the landing's utm tags — FIRST TOUCH, same rule as the click. */
function rememberUtmParams(search: string): void {
  const params = new URLSearchParams(search);
  const utms: Record<string, string> = {};
  for (const key of UTM_PARAMS) {
    const value = params.get(key);
    if (value) utms[key] = value;
  }
  if (Object.keys(utms).length === 0) return;
  try {
    if (!globalThis.localStorage.getItem(SHORT_LINK_UTM_KEY)) {
      globalThis.localStorage.setItem(SHORT_LINK_UTM_KEY, JSON.stringify(utms));
    }
  } catch {
    // Private mode: the tags live only as long as this page.
  }
}

/**
 * Everything this browser's visit is tagged with: the stored utm params plus
 * the click id. This is what rides on every outbound duncit link, so the
 * identity survives hops that storage cannot cross.
 */
export function storedAttributionParams(): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const rawUtms = globalThis.localStorage.getItem(SHORT_LINK_UTM_KEY);
    if (rawUtms) Object.assign(params, JSON.parse(rawUtms));
  } catch {
    // Unreadable storage or corrupt JSON — carry what we can.
  }
  const clickId = storedShortLinkClickId();
  if (clickId) params.dlc = clickId;
  return params;
}

/** Whether a link points at one of our own surfaces (any *.duncit.com page,
 * or the native app's duncit: scheme). Only those get decorated — the tags
 * are nobody else's business. */
export function isAttributableLink(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.protocol === 'duncit:') return true;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return url.hostname === 'duncit.com' || url.hostname.endsWith('.duncit.com');
  } catch {
    return false;
  }
}

/**
 * The URL with this visit's attribution attached. Params the URL already
 * carries win — a link that names its own campaign meant it. Returns the
 * input untouched when nothing is stored or the URL cannot be parsed.
 */
export function withAttribution(href: string): string {
  const entries = Object.entries(storedAttributionParams());
  if (entries.length === 0) return href;
  try {
    const url = new URL(href);
    for (const [key, value] of entries) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return href;
  }
}

/**
 * Keep the tags on every hyperlink jump.
 *
 * A capture-phase click listener rewrites the anchor's href to carry the
 * stored attribution BEFORE the browser follows it — the same trick GA's
 * cross-domain linker uses. This is what makes "utm hamesha lagi rahe" true
 * across surfaces: localStorage does not cross origins, so the URL is the
 * only vehicle from a website to mWeb, or from mWeb into the native app.
 * Installed once at root by every surface; returns the uninstaller.
 */
export function installAttributionLinkDecorator(doc: Document = globalThis.document): () => void {
  const decorate = (event: Event) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    // The a[href] selector guarantees the attribute exists.
    const raw = anchor.getAttribute('href') as string;
    // In-page fragments never leave the page — decorating one would turn a
    // scroll into a navigation.
    if (raw.startsWith('#')) return;
    if (!isAttributableLink(anchor.href)) return;
    const decorated = withAttribution(anchor.href);
    if (decorated !== anchor.href) anchor.href = decorated;
  };
  // auxclick covers middle-click open-in-new-tab, which also navigates.
  doc.addEventListener('click', decorate, true);
  doc.addEventListener('auxclick', decorate, true);
  return () => {
    doc.removeEventListener('click', decorate, true);
    doc.removeEventListener('auxclick', decorate, true);
  };
}
