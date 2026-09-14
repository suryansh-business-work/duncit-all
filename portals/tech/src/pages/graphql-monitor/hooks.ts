import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { DEFAULT_RANGE, isMonitorRange } from './labels';
import { GRAPHQL_MONITOR_SETTINGS, type MonitorRange, type MonitorSettings } from './queries';

/** The server folds traffic into its rollups once a minute; reading faster re-reads the same numbers. */
export const MONITOR_POLL_MS = 60_000;

/**
 * The selected range, kept in the URL (`?range=`) so a reload, a bookmark or a
 * pasted link opens the same window.
 */
export function useMonitorRange(): [MonitorRange, (range: MonitorRange) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('range');
  const range = isMonitorRange(raw) ? raw : DEFAULT_RANGE;
  const setRange = useCallback(
    (next: MonitorRange) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          updated.set('range', next);
          return updated;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  return [range, setRange];
}

/** The admin-chosen p95 past which an operation reads as slow; null until it loads. */
export function useSlowThreshold(): number | null {
  const { data } = useQuery<{ graphqlMonitorSettings: MonitorSettings }>(GRAPHQL_MONITOR_SETTINGS, {
    fetchPolicy: 'cache-first',
  });
  return data?.graphqlMonitorSettings.slow_threshold_ms ?? null;
}
