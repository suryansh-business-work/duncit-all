import { useEffect, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { APP_INSIGHTS_QUERIES, APP_INSIGHTS_STATUS, type AppInsightIntegration, type AppInsightStore } from './queries';

/** How often the status is re-read while a sync runs. */
export const SYNC_POLL_MS = 5_000;

export const isSyncing = (integrations: readonly AppInsightIntegration[]) =>
  integrations.some((integration) => integration.status === 'SYNCING');

/**
 * Both stores' integrations, kept fresh while a sync runs: the status is
 * polled every few seconds until no store is syncing, and the moment the last
 * one finishes every dashboard, data table and sync log on the page is read
 * again — so the numbers on screen are the ones the sync just stored.
 */
export function useAppInsightsStatus() {
  const client = useApolloClient();
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(APP_INSIGHTS_STATUS, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const integrations = data?.appInsightsStatus ?? [];
  const syncing = isSyncing(integrations);
  const wasSyncing = useRef(false);

  useEffect(() => {
    if (syncing) startPolling(SYNC_POLL_MS);
    else stopPolling();
    if (wasSyncing.current && !syncing) {
      client.refetchQueries({ include: APP_INSIGHTS_QUERIES }).catch(() => undefined);
    }
    wasSyncing.current = syncing;
    return stopPolling;
  }, [syncing, startPolling, stopPolling, client]);

  const byStore = (store: AppInsightStore) => integrations.find((integration) => integration.store === store) ?? null;
  return { integrations, byStore, syncing, loading: loading && !data, error, refetch };
}
