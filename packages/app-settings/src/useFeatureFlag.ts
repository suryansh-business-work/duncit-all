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

/**
 * Reads the server's public feature-flag set and returns whether the given
 * key is enabled. Defaults to `false` while loading or when the flag is
 * missing on the server.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const { data, loading } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FEATURE_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  if (loading && !data) return defaultValue;
  const list = data?.publicFeatureFlags ?? [];
  const flag = list.find((f) => f.key === key);
  if (!flag) return defaultValue;
  return flag.enabled === true;
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
