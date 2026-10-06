/**
 * Public pages — one contract for mWeb, the portals and the native app.
 *
 * A venue owner (or a host) publishes a page anyone can open without signing
 * in, and gets a tracked duncit.com link, its QR and a printable A4 poster.
 * The documents travel as plain strings for the same reason the share-link
 * mutation does: this package has no GraphQL client of its own and must stay
 * framework-free for the native bundle.
 */

import { firstGraphQLError } from './parse-api-error';

/** Whose page. Mirrors the server enum PublicPageKind. */
export type PublicPageKind = 'VENUE' | 'HOST';

export const MY_PUBLIC_PAGE_QUERY = /* GraphQL */ `
  query MyPublicPage($kind: PublicPageKind!, $refId: ID, $days: Int) {
    myPublicPage(kind: $kind, ref_id: $refId, days: $days) {
      published
      link {
        url
        code
        qr_data_url
      }
      stats {
        total_clicks
        unique_visitors
        platforms {
          label
          count
        }
        cities {
          label
          count
        }
      }
      funnel {
        steps {
          step
          count
        }
        conversion_rate
      }
    }
  }
`;

export const PUBLISH_PUBLIC_PAGE_MUTATION = /* GraphQL */ `
  mutation PublishPublicPage($kind: PublicPageKind!, $refId: ID) {
    publishPublicPage(kind: $kind, ref_id: $refId) {
      url
      code
      qr_data_url
    }
  }
`;

export const PUBLIC_PAGE_POSTER_QUERY = /* GraphQL */ `
  query MyPublicPagePoster($kind: PublicPageKind!, $refId: ID, $copy: PublicPagePosterCopy!) {
    myPublicPagePosterPdfBase64(kind: $kind, ref_id: $refId, copy: $copy)
  }
`;

export interface PublicPageLink {
  url: string;
  code: string | null;
  qr_data_url: string;
}

export interface PublicPageBreakdown {
  label: string;
  count: number;
}

export interface PublicPageInsights {
  published: boolean;
  link: PublicPageLink | null;
  stats: {
    total_clicks: number;
    unique_visitors: number;
    platforms: PublicPageBreakdown[];
    cities: PublicPageBreakdown[];
  } | null;
  funnel: {
    steps: Array<{ step: string; count: number }>;
    conversion_rate: number;
  } | null;
}

/** The reporting windows the owner can pick; 0 is all time. */
export const PUBLIC_PAGE_RANGES = [
  { days: 7, labelKey: 'publicPage.range.week' },
  { days: 30, labelKey: 'publicPage.range.month' },
  { days: 90, labelKey: 'publicPage.range.quarter' },
  { days: 0, labelKey: 'publicPage.range.all' },
] as const;

export interface PublicPageTile {
  key: string;
  labelKey: string;
  value: string;
}

const stepCount = (insights: PublicPageInsights, step: string) =>
  insights.funnel?.steps.find((entry) => entry.step === step)?.count ?? 0;

/**
 * The numbers the owner reads, in order: who opened the page, and how far
 * they went — signed up, opened a pod, paid. Built once here so mWeb, the
 * portals and the app show the same tiles with the same keys.
 */
export function publicPageTiles(insights: PublicPageInsights): PublicPageTile[] {
  const conversion = insights.funnel?.conversion_rate ?? 0;
  return [
    { key: 'clicks', labelKey: 'publicPage.stats.clicks', value: String(insights.stats?.total_clicks ?? 0) },
    { key: 'visitors', labelKey: 'publicPage.stats.visitors', value: String(insights.stats?.unique_visitors ?? 0) },
    { key: 'signed-up', labelKey: 'publicPage.stats.signedUp', value: String(stepCount(insights, 'SIGNED_UP')) },
    { key: 'viewed-pod', labelKey: 'publicPage.stats.viewedPod', value: String(stepCount(insights, 'VIEWED_POD')) },
    { key: 'paid', labelKey: 'publicPage.stats.paid', value: String(stepCount(insights, 'PAID')) },
    { key: 'conversion', labelKey: 'publicPage.stats.conversion', value: `${conversion}%` },
  ];
}

/**
 * The sentence for a failed load or publish. A venue that is not approved yet,
 * or an account that is not a host, is told why rather than "try again" —
 * retrying cannot fix either.
 */
export function publicPageErrorKey(err: unknown, fallbackKey: string): string {
  const code = firstGraphQLError(err)?.extensions?.code;
  if (code === 'FAILED_PRECONDITION') return 'publicPage.card.notApproved';
  if (code === 'FORBIDDEN') return 'publicPage.card.notHost';
  return fallbackKey;
}

/** The page's title, made safe for a file name on any file system. */
function fileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'duncit';
}

/** A file name for the printable poster. */
export const publicPagePosterFileName = (title: string): string => `${fileSlug(title)}-poster.pdf`;

/** A file name for the saved QR image, named like the poster. */
export const publicPageQrFileName = (title: string): string => `${fileSlug(title)}-qr.png`;

/** The pod a post-sign-in redirect points at, or null when it is not a pod page. */
export function podSlugsFromPath(path: string | null | undefined): { clubSlug: string; podSlug: string } | null {
  const match = /^\/club\/([^/?#]+)\/pod\/([^/?#]+)/.exec(path ?? '');
  const [, club, pod] = match ?? [];
  if (!club || !pod) return null;
  return { clubSlug: decodeURIComponent(club), podSlug: decodeURIComponent(pod) };
}
