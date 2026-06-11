// Dependency-free web scraping helpers for CRM website pages: page discovery
// (sitemap-first, homepage-links fallback) and HTML → readable-text extraction.
// Uses Node's global fetch (Node 18+); no cheerio/puppeteer needed.

const UA = 'Mozilla/5.0 (compatible; DuncitCRM/1.0; +https://duncit.com)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_CONTENT_CHARS = 50000;

/** Fetch a URL as text with a hard timeout. Returns body + HTTP status. */
export async function fetchText(url: string): Promise<{ status: number; body: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml' },
    });
    const body = await res.text();
    return { status: res.status, body, contentType: res.headers.get('content-type') ?? '' };
  } finally {
    clearTimeout(timer);
  }
}

/** Normalise a user-entered website into an absolute http(s) URL, or null. */
export function normaliseSite(raw?: string | null): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProto).toString();
  } catch {
    return null;
  }
}

const locMatches = (xml: string): string[] =>
  [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((m) => m[1].trim()).filter(Boolean);

const sameOrigin = (a: string, origin: string) => {
  try {
    return new URL(a).origin === origin;
  } catch {
    return false;
  }
};

/**
 * Discover up to `limit` page URLs for a site. Tries `/sitemap.xml` first
 * (resolving one level of sitemap-index nesting), then falls back to crawling
 * the homepage's internal links. Always includes the homepage itself.
 */
/** Add same-origin URLs from a nested child sitemap (one index level), up to `limit`. */
async function addChildSitemapLocs(loc: string, origin: string, limit: number, found: Set<string>): Promise<void> {
  const child = await fetchText(loc).catch(() => null);
  if (!child || child.status >= 400) return;
  for (const u of locMatches(child.body)) {
    if (found.size >= limit) break;
    if (sameOrigin(u, origin)) found.add(u);
  }
}

/** Populate `found` from `/sitemap.xml` (resolving one level of index nesting). */
async function collectFromSitemap(origin: string, limit: number, found: Set<string>): Promise<void> {
  const sm = await fetchText(`${origin}/sitemap.xml`).catch(() => null);
  if (!sm || sm.status >= 400) return;
  for (const loc of locMatches(sm.body)) {
    if (found.size >= limit) break;
    if (/\.xml(\?|$)/i.test(loc)) {
      await addChildSitemapLocs(loc, origin, limit, found);
    } else if (sameOrigin(loc, origin)) {
      found.add(loc);
    }
  }
}

/** Crawl the homepage's internal links into `found` (same-origin only), up to `limit`. */
async function collectFromHomepage(site: string, origin: string, limit: number, found: Set<string>): Promise<void> {
  const home = await fetchText(site).catch(() => null);
  if (!home || home.status >= 400) return;
  for (const m of home.body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    if (found.size >= limit) break;
    try {
      const abs = new URL(m[1], site).toString();
      if (sameOrigin(abs, origin)) found.add(abs.split('#')[0]);
    } catch {
      /* skip malformed href */
    }
  }
}

export async function discoverUrls(site: string, limit: number): Promise<string[]> {
  const origin = new URL(site).origin;
  const found = new Set<string>();

  await collectFromSitemap(origin, limit, found);

  if (found.size === 0) {
    found.add(site);
    await collectFromHomepage(site, origin, limit, found);
  }

  return [...found].slice(0, limit);
}

/** Strip an HTML document down to a page title + collapsed readable text. */
export function extractContent(html: string): { title: string | null; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()).slice(0, 300) : null;
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CONTENT_CHARS);
  return { title, text };
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}
