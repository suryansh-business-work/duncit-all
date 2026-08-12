import type { PageMeta } from './page-meta';

const META_START = '<!-- meta:start -->';
const META_END = '<!-- meta:end -->';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const absoluteUrl = (origin: string, url: string): string =>
  url.startsWith('http') ? url : `${origin}${url}`;

/** Mirrors the authored index.html default — used only when branding is unreachable. */
const FALLBACK_THEME_COLOR = '#F82C2E';

/**
 * The tag block a crawler reads. EVERY brandable head tag is emitted here,
 * server-side, per request — nothing content-bearing stays hardcoded in
 * index.html (its marker block is only the no-API fallback). `og:title` stays
 * the bare title (cards show the site name separately via og:site_name); the
 * `<title>` gets the suffix.
 */
export function buildMetaBlock(meta: PageMeta, origin: string, path: string): string {
  const pageUrl = `${origin}${path}`;
  const title = escapeHtml(meta.title);
  const fullTitle =
    meta.title === meta.appName ? title : `${title} | ${escapeHtml(meta.appName)}`;
  const description = escapeHtml(meta.description);
  const rawImage = meta.imageUrl ?? meta.defaultImageUrl;
  const image = rawImage ? escapeHtml(absoluteUrl(origin, rawImage)) : null;
  // An entity photo earns the large card; the fallback logo reads better small.
  const card = meta.imageUrl ? 'summary_large_image' : 'summary';

  const tags = [
    `<meta name="theme-color" content="${escapeHtml(meta.themeColor ?? FALLBACK_THEME_COLOR)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${escapeHtml(meta.appName)}" />`,
    `<title>${fullTitle}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(meta.appName)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta name="twitter:card" content="${card}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];
  if (image) {
    tags.push(
      `<meta property="og:image" content="${image}" />`,
      `<meta name="twitter:image" content="${image}" />`
    );
  }
  return tags.join('\n    ');
}

/**
 * Swap whatever sits between the index.html markers for the per-request block.
 * Missing markers mean a build regression — the page still ships, unchanged.
 */
export function injectMetaBlock(html: string, block: string): string {
  const start = html.indexOf(META_START);
  const end = html.indexOf(META_END);
  if (start === -1 || end === -1 || end < start) return html;
  const before = html.slice(0, start + META_START.length);
  const after = html.slice(end);
  return `${before}\n    ${block}\n    ${after}`;
}
