/**
 * The head tags every Duncit website page is unfurled by.
 *
 * A link posted into WhatsApp, Slack or X is fetched once by a crawler that
 * reads the head and leaves — it never runs the page's JavaScript. Until this
 * existed the sites shipped a title and a description and nothing else, so
 * every duncit.com link anyone shared unfurled without a picture and, on a
 * page whose content arrives from the API, under the wrong title.
 *
 * The tags are built as a STRING rather than as markup so that the same
 * function serves both writers: `SiteMeta.astro` at build time, and the
 * websites' HTML server at request time, for the pages whose card cannot be
 * known until somebody asks for one (a blog post, a short link). Two builders
 * would drift, and a card that drifts is only found by sharing it.
 */

/** The block the HTML server replaces. Emitted by SiteMeta.astro. */
export const META_START = '<!-- meta:start -->';
export const META_END = '<!-- meta:end -->';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string): string =>
  String(value).replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

export interface SiteMetaInput {
  /** The page's own title, without the site name — the suffix is added here. */
  title: string;
  description: string;
  /** The page's absolute address: what a re-share reopens and what is indexed. */
  url: string;
  siteName: string;
  /** The card picture. Null renders a card with no image rather than a broken one. */
  imageUrl?: string | null;
  /** True when the image belongs to the page (a post's own photo) rather than
   * being the site logo standing in — only then is the wide card an improvement. */
  largeImage?: boolean;
  /** `article` for a blog post, so it is unfurled as one. */
  type?: 'website' | 'article';
}

export function buildSiteMetaTags(meta: SiteMetaInput): string {
  const title = escapeHtml(meta.title);
  const siteName = escapeHtml(meta.siteName);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = meta.imageUrl ? escapeHtml(meta.imageUrl) : null;
  // A page that IS the site does not want its name twice.
  const fullTitle = meta.title === meta.siteName ? title : `${title} | ${siteName}`;

  const tags = [
    `<title>${fullTitle}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${meta.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="${meta.largeImage ? 'summary_large_image' : 'summary'}" />`,
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
 * Swap the built page's marker block for a freshly composed one.
 *
 * Missing markers mean the page was built before SiteMeta existed, or the
 * build regressed: the page still ships, with the tags it has.
 */
export function injectSiteMeta(html: string, block: string): string {
  const start = html.indexOf(META_START);
  const end = html.indexOf(META_END);
  if (start === -1 || end === -1 || end < start) return html;
  return `${html.slice(0, start + META_START.length)}\n    ${block}\n    ${html.slice(end)}`;
}
