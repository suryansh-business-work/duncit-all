/**
 * The crawler-facing files every Duncit website serves: robots.txt, the
 * sitemap, and the JSON-LD that tells a search engine who the site belongs to.
 *
 * Before these existed duncit.com, earnwith and ads answered /robots.txt and
 * /sitemap.xml with a 404, and partners answered them with its home page at a
 * 200 — which a crawler reads as a robots file full of HTML. One builder per
 * file, here, so the sites cannot drift apart.
 */

export interface SitemapEntry {
  /** Absolute address of the page. */
  loc: string;
  /** ISO date the page last changed, when it is known. */
  lastmod?: string | null;
}

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
};

const escapeXml = (value: string): string => value.replaceAll(/[<>&'"]/g, (char) => XML_ESCAPES[char]);

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

/** Open to every crawler, minus the given paths, pointing at the site's own sitemap. */
export function buildRobotsTxt(siteUrl: string, disallow: string[] = []): string {
  const rules = ['User-agent: *', 'Allow: /', ...disallow.map((path) => `Disallow: ${path}`)];
  return `${rules.join('\n')}\n\nSitemap: ${trimTrailingSlashes(siteUrl)}/sitemap.xml\n`;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

/**
 * The indexable addresses of a site's static pages, from the keys of
 * `import.meta.glob('./**\/*.astro')` called in its `src/pages`. Error pages,
 * dynamic routes (`[slug]`) and the paths in `exclude` are left out. Each
 * address ends in a slash, which is how Astro's directory build canonicalises it.
 */
export function routesFromPageFiles(files: string[], exclude: string[] = []): string[] {
  return files
    .filter((file) => !/\[|\/_|(^|\/)(404|500)\.astro$/.test(file))
    .map((file) => {
      const path = file.replace(/^\.\//, '').replace(/\.astro$/, '').replace(/(^|\/)index$/, '');
      return path ? `/${path}/` : '/';
    })
    .filter((route) => !exclude.includes(route))
    .sort((a, b) => a.localeCompare(b));
}

export const ROBOTS_HEADERS = { 'content-type': 'text/plain; charset=utf-8' };
export const SITEMAP_HEADERS = { 'content-type': 'application/xml; charset=utf-8' };

export interface OrganizationInput {
  name: string;
  /** The company's home — duncit.com on every site, so the subdomains name one organization. */
  url: string;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  /** The company's own profiles elsewhere (Instagram, LinkedIn…). */
  sameAs?: string[];
}

type JsonLd = Record<string, unknown>;

const organizationId = (url: string): string => `${trimTrailingSlashes(url)}/#organization`;

export function buildOrganizationJsonLd(org: OrganizationInput): JsonLd {
  const contactPoint =
    org.email || org.phone
      ? {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          ...(org.email ? { email: org.email } : {}),
          ...(org.phone ? { telephone: org.phone } : {}),
        }
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(org.url),
    name: org.name,
    url: org.url,
    ...(org.logoUrl ? { logo: org.logoUrl } : {}),
    ...(org.sameAs?.length ? { sameAs: org.sameAs } : {}),
    ...(contactPoint ? { contactPoint } : {}),
  };
}

/** One site of the organization; `organizationUrl` ties it back to the company node. */
export function buildWebSiteJsonLd(site: { name: string; url: string; organizationUrl: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    publisher: { '@id': organizationId(site.organizationUrl) },
  };
}

/** JSON safe to place inside a script tag: a `</script>` in any value cannot close it. */
export const serializeJsonLd = (data: JsonLd | JsonLd[]): string =>
  JSON.stringify(data).replaceAll('<', String.raw`<`);
