import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

export const PUBLIC_FEATURE_FLAGS = gql`
  query PublicFeatureFlags {
    publicFeatureFlags {
      key
      enabled
    }
  }
`;

interface PublicFlag {
  key: string;
  enabled: boolean;
}

export interface FeatureFlagState {
  /**
   * The flag set has not arrived yet. A route gate has to WAIT on this rather
   * than redirect: `enabled` is the default while loading, and a reload of a
   * gated page would otherwise bounce away before the answer landed.
   */
  pending: boolean;
  enabled: boolean;
}

/**
 * Reads the server's public feature-flag set and says whether the given key
 * is enabled — and, separately, whether that answer has arrived at all. The
 * form a route gate needs: `useFeatureFlag` alone reads `false` for the
 * first render after a reload, which is a redirect if the gate cannot tell
 * "off" from "not loaded yet".
 */
export function useFeatureFlagState(key: string, defaultValue = false): FeatureFlagState {
  const { data, loading } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FEATURE_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  const pending = loading && !data;
  const flag = (data?.publicFeatureFlags ?? []).find((f) => f.key === key);
  const enabled = flag ? flag.enabled === true : defaultValue;
  return { pending, enabled: pending ? defaultValue : enabled };
}

/**
 * Reads the server's public feature-flag set and returns whether the given
 * key is enabled. Defaults to `false` while loading or when the flag is
 * missing on the server.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  return useFeatureFlagState(key, defaultValue).enabled;
}

/**
 * The whole flag set as a map, for `useSession()`.
 *
 * Shares the query and the cache with `useFeatureFlag` — a component that reads
 * one flag and a header that reads the session do not cause two round trips.
 */
export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FEATURE_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  return useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const flag of data?.publicFeatureFlags ?? []) map[flag.key] = flag.enabled === true;
    return map;
  }, [data]);
}
