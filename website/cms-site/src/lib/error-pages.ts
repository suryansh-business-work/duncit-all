import type { CmsRenderResult } from '@duncit/gql-types';
import { errorPage } from './cms-api';

/**
 * Each site's designed 500 and 503 pages, kept in this server's memory.
 *
 * They are needed exactly when they cannot be fetched: a 503 means the CMS API
 * is unreachable, a 500 that rendering just failed. So every successful visit
 * refreshes a site's copies in the background (at most every few minutes), and
 * the failure paths read the last good copy — or fall back to the built-in page.
 */
const REFRESH_AFTER_MS = 5 * 60 * 1000;
const KEPT_CODES = [500, 503] as const;
type KeptCode = (typeof KEPT_CODES)[number];

interface SiteErrorPages {
  fetchedAt: number;
  pages: Partial<Record<KeptCode, CmsRenderResult>>;
}

const cache = new Map<string, SiteErrorPages>();
const refreshing = new Set<string>();

async function refresh(host: string): Promise<void> {
  const results = await Promise.all(KEPT_CODES.map((code) => errorPage(host, code).then((page) => [code, page] as const)));
  const pages: SiteErrorPages['pages'] = {};
  for (const [code, page] of results) if (page) pages[code] = page;
  cache.set(host, { fetchedAt: Date.now(), pages });
}

/** After a page rendered fine: refresh this site's error pages if they are stale. Never delays the visit. */
export function rememberErrorPages(host: string): void {
  const known = cache.get(host);
  if ((known && Date.now() - known.fetchedAt < REFRESH_AFTER_MS) || refreshing.has(host)) return;
  refreshing.add(host);
  refresh(host)
    .catch((error: unknown) => {
      console.error('[cms-site] error pages refresh failed', { host, reason: error instanceof Error ? error.message : String(error) });
    })
    .finally(() => refreshing.delete(host));
}

/** The last good copy of this site's error page, if it has one. */
export function cachedErrorPage(host: string, code: KeptCode): CmsRenderResult | null {
  return cache.get(host)?.pages[code] ?? null;
}
