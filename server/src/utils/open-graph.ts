import { lookup } from 'node:dns/promises';
import { logs } from '@observability/log';
import { decodeHtmlEntities } from './html';
import { isNonPublicAddress, isNonPublicHost } from './public-host';

/**
 * Read the link-preview tags a page publishes about itself — what WhatsApp,
 * Slack or X would show if the page were pasted into a chat.
 *
 * Two callers: a staff-chat message's preview card, and a short link's card,
 * which has to describe whatever the link currently points at. Either way the
 * URL came from a person, which makes this a server-side fetch of a URL
 * somebody else chose — SSRF by definition. So the fetch is kept boring:
 * http(s) only, every hop of a redirect checked against the private ranges
 * (the name AND what it resolves to), a hard timeout, and only the head read.
 */

export interface OpenGraphTags {
  title: string | null;
  description: string | null;
  /** Absolute http(s) URL, already resolved against the page. */
  image: string | null;
  site_name: string | null;
}

/**
 * Sent on every request this makes. Our own short-link resolver reads it: a
 * link whose destination is another short link would otherwise have the card
 * fetch the card fetch the card — see shortLink.router.ts.
 */
export const UNFURL_HEADER = 'x-duncit-unfurl';

/**
 * The agent pages are asked as. Many sites only render their tags for the
 * unfurlers they know, so this names the most widely recognised one; the card
 * we build is then the card those apps would have built.
 */
const USER_AGENT = 'facebookexternalhit/1.1 (compatible; DuncitLinkPreview/1.0)';

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;
const MAX_HOPS = 5;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

const EMPTY: OpenGraphTags = { title: null, description: null, image: null, site_name: null };

const META_TAG = /<meta\b[^>]*>/gi;
/**
 * One `name="value"` pair. The lookbehind starts a match only at the head of a
 * name: without it a fetched page's `<meta aaaa…a>` restarts the name at every
 * character and rescans the run each time — quadratic on input we do not
 * control (Sonar S5852). A start inside a name could never match where the
 * head of that same name did not, so the pairs found are unchanged.
 */
const ATTRIBUTE = /(?<![\w:-])([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const TITLE_TAG = /<title[^>]*>([^<]{1,400})<\/title>/i;
const HEAD_END = /<\/head>/i;

/** A URL this server may request: public http(s), by name and by address. */
async function isFetchable(url: URL): Promise<boolean> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (isNonPublicHost(host)) return false;
  // A public NAME can still resolve to a private address.
  const addresses = await lookup(host, { all: true });
  return addresses.length > 0 && addresses.every((a) => !isNonPublicAddress(a.address, a.family));
}

/** The page up to its `</head>` — the tags live there, the body never matters. */
async function readHead(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let html = '';
  while (html.length < MAX_BYTES && !HEAD_END.test(html)) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return html;
}

/** Follow redirects by hand, so each hop is checked before it is requested. */
async function fetchHead(start: URL, signal: AbortSignal): Promise<{ html: string; url: URL } | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    if (!(await isFetchable(url))) return null;
    const res = await fetch(url, {
      signal,
      redirect: 'manual',
      headers: { accept: 'text/html', 'user-agent': USER_AGENT, [UNFURL_HEADER]: '1' },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) {
      await res.body?.cancel();
      return null;
    }
    return { html: await readHead(res), url };
  }
  return null;
}

/** Every `<meta>` keyed by its property/name, lower-cased; the first one wins. */
function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(META_TAG)) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(ATTRIBUTE)) {
      attributes.set((match[1] ?? '').toLowerCase(), match[2] ?? match[3] ?? '');
    }
    const key = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase();
    const content = attributes.get('content')?.trim();
    if (key && content && !tags.has(key)) tags.set(key, decodeHtmlEntities(content));
  }
  return tags;
}

const firstOf = (tags: Map<string, string>, keys: string[]) =>
  keys.map((key) => tags.get(key)).find(Boolean) ?? null;

const clip = (value: string | null, max: number) => (value ? value.slice(0, max) : null);

function absoluteImage(raw: string | null, page: URL): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, page);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The tags out of a page's head. Exported for the tests. */
export function parseOpenGraph(html: string, page: URL): OpenGraphTags {
  const tags = metaTags(html);
  const titleTag = TITLE_TAG.exec(html)?.[1]?.trim();
  const title = firstOf(tags, ['og:title', 'twitter:title']) ?? (titleTag ? decodeHtmlEntities(titleTag) : null);
  return {
    title: clip(title, MAX_TITLE),
    description: clip(firstOf(tags, ['og:description', 'twitter:description', 'description']), MAX_DESCRIPTION),
    image: absoluteImage(firstOf(tags, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']), page),
    site_name: firstOf(tags, ['og:site_name']),
  };
}

/**
 * The page's tags, all null when it cannot be read — a dead link, a private
 * host, a timeout, a page that is not HTML. A missing preview is a normal
 * outcome for a pasted link, so it is not worth an error; the caller decides
 * what an empty card means.
 */
export async function fetchOpenGraph(raw: string): Promise<OpenGraphTags> {
  let start: URL;
  try {
    start = new URL(raw);
  } catch {
    return EMPTY;
  }
  const abort = new AbortController();
  const timer = globalThis.setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const page = await fetchHead(start, abort.signal);
    return page ? parseOpenGraph(page.html, page.url) : EMPTY;
  } catch (error) {
    logs.server.warn('openGraph', 'fetch', { error, host: start.hostname });
    return EMPTY;
  } finally {
    globalThis.clearTimeout(timer);
  }
}
