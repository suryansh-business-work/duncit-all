import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import type { PublicPageInsights, PublicPageKind } from '@duncit/utils';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { fetchPublicPage, publicPageNativeErrorKey, publishPublicPage } from './publicPageRequests';

/** The window the numbers open on: the last 30 days. */
const DEFAULT_DAYS = 30;

export interface PublicPageState {
  insights: PublicPageInsights | null;
  isLoading: boolean;
  /** Translation key of the load failure, or null. */
  errorKey: string | null;
  days: number;
  setDays: (days: number) => void;
  retry: () => void;
  publish: () => Promise<void>;
  publishing: boolean;
  /** Translation key of the publish failure, or null. */
  publishErrorKey: string | null;
}

/**
 * The owner's public page: whether it is published, its link and QR, and the
 * tracking numbers for the picked period. Publishing is idempotent on the
 * server; the page is re-read afterwards so the stats arrive with the link.
 * The RN twin of mWeb's usePublicPage (rule 27).
 */
export function usePublicPage(kind: PublicPageKind, refId: string | null): PublicPageState {
  const [insights, setInsights] = useState<PublicPageInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [attempt, setAttempt] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishErrorKey, setPublishErrorKey] = useState<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Another venue is another page: never show the previous one's numbers.
  useEffect(() => {
    setInsights(null);
    setPublishErrorKey(null);
  }, [kind, refId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorKey(null);
    fetchPublicPage(kind, refId, days)
      .then((data) => {
        if (active) setInsights(data);
      })
      .catch((error: unknown) => {
        logs.mobileApp.error('public-page', 'load', { error, kind });
        if (active) setErrorKey(publicPageNativeErrorKey(error, 'publicPage.card.loadFailed'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, refId, days, attempt]);

  useRefreshRegistration(retry);

  const publish = useCallback(async () => {
    setPublishing(true);
    setPublishErrorKey(null);
    try {
      await publishPublicPage(kind, refId);
      retry();
    } catch (error) {
      logs.mobileApp.error('public-page', 'publish', { error, kind });
      setPublishErrorKey(publicPageNativeErrorKey(error, 'publicPage.card.publishFailed'));
    } finally {
      setPublishing(false);
    }
  }, [kind, refId, retry]);

  return {
    insights,
    isLoading,
    errorKey,
    days,
    setDays,
    retry,
    publish,
    publishing,
    publishErrorKey,
  };
}
