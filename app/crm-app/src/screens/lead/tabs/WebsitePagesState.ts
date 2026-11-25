import { useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmUnfetchedPages } from '@duncit/utils';

import {
  CrmAppDeleteWebsitePageDocument,
  CrmAppFetchWebsitePageDocument,
  CrmAppLeadWebsiteDocument,
  CrmAppScrapeWebsiteDocument,
  CrmAppWebsitePagesDocument,
} from '@/graphql/leadTabsB';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { WebsiteKind } from './TabsBTypes';

export type WebsitePage = ResultOf<typeof CrmAppWebsitePagesDocument>['crmWebsitePages'][number];

/**
 * A lead's website and its saved pages, with the portal Website tab's actions:
 * scrape the site into pages, fetch one page's content or every page still
 * unread (one after another, kind to the site), and delete a page.
 */
export function useWebsitePages(kind: WebsiteKind, id: string) {
  const { t } = useTranslation();
  const fallbackError = t('crmApp.common.loadFailed');
  const siteVars = useMemo(
    () => ({ id, venue: kind === 'VENUE_LEAD', host: kind === 'HOST_LEAD' }),
    [kind, id],
  );
  const variables = useMemo(() => ({ entity_type: kind, lead_id: id }), [kind, id]);
  const site = useGqlQuery(CrmAppLeadWebsiteDocument, siteVars, { fallbackError });
  const pagesQuery = useGqlQuery(CrmAppWebsitePagesDocument, variables, { fallbackError });
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const pages = pagesQuery.data?.crmWebsitePages ?? [];
  const lead = site.data?.venue ?? site.data?.host;
  const failed = (err: unknown) => setError(errorMessage(err, t('crmApp.common.saveFailed')));
  const fetchPage = (page: WebsitePage) =>
    gqlRequest(CrmAppFetchWebsitePageDocument, { id: page.id });

  return {
    website: lead?.website || null,
    siteLoading: site.loading && !site.data,
    siteError: site.data ? null : site.error,
    refetchSite: site.refetch,
    pages,
    unfetched: crmUnfetchedPages(pages),
    pagesLoading: pagesQuery.loading && !pagesQuery.data,
    pagesError: pagesQuery.data ? null : pagesQuery.error,
    refetchPages: pagesQuery.refetch,
    error,
    clearError: () => setError(null),
    scraping,
    deleting,
    fetchingId,
    progress,
    /** Resolves true when the pages were discovered and saved. */
    scrape: async (limit: number): Promise<boolean> => {
      setError(null);
      setScraping(true);
      try {
        await gqlRequest(CrmAppScrapeWebsiteDocument, { ...variables, limit });
        await pagesQuery.refetch();
        return true;
      } catch (err) {
        failed(err);
        return false;
      } finally {
        setScraping(false);
      }
    },
    fetchOne: async (page: WebsitePage) => {
      setFetchingId(page.id);
      try {
        await fetchPage(page);
      } catch (err) {
        failed(err);
      } finally {
        setFetchingId(null);
      }
      await pagesQuery.refetch();
    },
    /** Every page not fetched yet, one at a time; a page that fails does not stop the rest. */
    fetchAll: async () => {
      setError(null);
      const targets = crmUnfetchedPages(pages);
      setProgress({ done: 0, total: targets.length });
      for (const [index, page] of targets.entries()) {
        try {
          await fetchPage(page);
        } catch (err) {
          failed(err);
        }
        setProgress({ done: index + 1, total: targets.length });
      }
      setProgress(null);
      await pagesQuery.refetch();
    },
    remove: async (page: WebsitePage) => {
      setDeleting(true);
      try {
        await gqlRequest(CrmAppDeleteWebsitePageDocument, { id: page.id });
        await pagesQuery.refetch();
      } catch (err) {
        failed(err);
      } finally {
        setDeleting(false);
      }
    },
  };
}
