import { cachedGql } from './graphql-client';

/**
 * A pod's page for search engines — the one mWeb page that is indexed.
 *
 * The public `websitePodPage` query gives what the page shows any visitor; this
 * turns it into the text under the page's heading (inside #root, behind the
 * boot loader, so people never see it and React replaces it on mount) and a
 * schema.org Event, which is what lets Google list a pod as an event.
 */
export interface WebsitePodPage {
  title: string;
  description: string;
  start: string;
  end: string | null;
  virtual: boolean;
  image_urls: string[];
  price: number;
  currency: string;
  sold_out: boolean;
  club_name: string;
  club_slug: string;
  canonical_path: string;
  venue_name: string | null;
  locality: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
}

const POD_PAGE_QUERY = /* GraphQL */ `
  query MetaServerPodPage($club_slug: String!, $pod_slug: String!) {
    websitePodPage(club_slug: $club_slug, pod_slug: $pod_slug) {
      title
      description
      start
      end
      virtual
      image_urls
      price
      currency
      sold_out
      club_name
      club_slug
      canonical_path
      venue_name
      locality
      city
      region
      country_code
    }
  }
`;

const SITEMAP_QUERY = /* GraphQL */ `
  query MetaServerPodSitemap {
    websitePodSitemap {
      path
      updated_at
    }
  }
`;

/** Matches the API's Redis TTL, so the layers age together. */
const TTL_MS = 60 * 1000;
const SCHEMA = 'https://schema.org';

/** Undefined when the API could not be asked; null when there is no such public pod. */
export async function fetchPodPage(clubSlug: string, podSlug: string): Promise<WebsitePodPage | null | undefined> {
  const result = await cachedGql<{ websitePodPage: WebsitePodPage | null }>(
    POD_PAGE_QUERY,
    { club_slug: clubSlug, pod_slug: podSlug },
    TTL_MS
  );
  return result ? result.websitePodPage : undefined;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string): string => value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const joinFilled = (parts: Array<string | null>): string => parts.filter(Boolean).join(', ');

/** The pod's own words under its name: what crawlers that do not run JavaScript index. */
export function podRootHtml(pod: WebsitePodPage): string {
  const place = pod.virtual ? '' : joinFilled([pod.venue_name, pod.locality, pod.city]);
  const lines = [pod.description, pod.club_name, place].filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`);
  return `<main><h1>${escapeHtml(pod.title)}</h1>${lines.join('')}</main>`;
}

function eventLocation(pod: WebsitePodPage, pageUrl: string) {
  if (pod.virtual) return { '@type': 'VirtualLocation', url: pageUrl };
  return {
    '@type': 'Place',
    name: pod.venue_name || pod.locality || pod.city || pod.title,
    address: {
      '@type': 'PostalAddress',
      ...(pod.locality ? { addressLocality: joinFilled([pod.locality, pod.city]) } : {}),
      ...(pod.region ? { addressRegion: pod.region } : {}),
      ...(pod.country_code ? { addressCountry: pod.country_code } : {}),
    },
  };
}

/** The schema.org Event for the pod — the facts Google needs to list it as one. */
export function podEventLd(pod: WebsitePodPage, origin: string) {
  const pageUrl = `${origin}${pod.canonical_path}`;
  return {
    '@context': SCHEMA,
    '@type': 'Event',
    name: pod.title,
    ...(pod.description ? { description: pod.description } : {}),
    startDate: pod.start,
    ...(pod.end ? { endDate: pod.end } : {}),
    eventStatus: `${SCHEMA}/EventScheduled`,
    eventAttendanceMode: `${SCHEMA}/${pod.virtual ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    location: eventLocation(pod, pageUrl),
    ...(pod.image_urls.length ? { image: pod.image_urls } : {}),
    organizer: { '@type': 'Organization', name: pod.club_name, url: `${origin}/club/${pod.club_slug}` },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      price: pod.price,
      priceCurrency: pod.currency,
      availability: `${SCHEMA}/${pod.sold_out ? 'SoldOut' : 'InStock'}`,
    },
  };
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (value: string): string => value.replaceAll(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

/** /sitemap.xml: every public pod page still to come. Null when the API could not be asked. */
export async function podSitemapXml(origin: string): Promise<string | null> {
  const result = await cachedGql<{ websitePodSitemap: { path: string; updated_at: string | null }[] }>(SITEMAP_QUERY, {}, TTL_MS);
  if (!result) return null;
  const urls = result.websitePodSitemap.map(({ path, updated_at }) => {
    const modified = updated_at ? `<lastmod>${escapeXml(updated_at.slice(0, 10))}</lastmod>` : '';
    return `<url><loc>${escapeXml(`${origin}${path}`)}</loc>${modified}</url>`;
  });
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>'].join('\n');
}

/** /robots.txt: everything may be crawled (the SPA's scripts must be, to render it); only pod pages are indexable. */
export const robotsTxt = (origin: string): string =>
  // Directive and value apart, as website/ecomm-store/server/crawl.ts writes it: a crawler protocol, not copy.
  ['User-agent: *', 'Allow: /', ['Sitemap:', `${origin}/sitemap.xml`].join(' '), ''].join('\n');
