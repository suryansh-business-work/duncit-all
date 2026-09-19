/**
 * The head a crawler or a link unfurler reads, written into the page shell's
 * `<!-- meta:start -->…<!-- meta:end -->` block before the HTML leaves. The
 * SPA never runs for a crawler, so without this every shared event link would
 * look the same. Same block markers as the rest of Duncit's HTML servers.
 */
export const META_START = '<!-- meta:start -->';
export const META_END = '<!-- meta:end -->';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value: string): string => String(value).replaceAll(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  siteName: string;
  imageUrl?: string | null;
  type?: 'website' | 'article';
  /** `noindex` for pages that must not be listed (unlisted events). */
  noindex?: boolean;
}

export function buildMetaTags(meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const siteName = escapeHtml(meta.siteName);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const namesItself = meta.title.toLowerCase().includes(meta.siteName.toLowerCase());
  const tags = [
    `<title>${namesItself ? title : `${title} | ${siteName}`}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${meta.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="${meta.imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];
  if (meta.imageUrl) {
    const image = escapeHtml(meta.imageUrl);
    tags.push(`<meta property="og:image" content="${image}" />`, `<meta name="twitter:image" content="${image}" />`);
  }
  if (meta.noindex) tags.push('<meta name="robots" content="noindex" />');
  return tags.join('\n    ');
}

export function injectMeta(html: string, block: string): string {
  const start = html.indexOf(META_START);
  const end = html.indexOf(META_END);
  if (start === -1 || end === -1 || end < start) return html;
  return `${html.slice(0, start + META_START.length)}\n    ${block}\n    ${html.slice(end)}`;
}

/** JSON-LD for an event, so search engines list it as one. */
export function jsonLdTag(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', String.raw`<`)}</script>`;
}
