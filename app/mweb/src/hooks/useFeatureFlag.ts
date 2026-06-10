import { gql, useQuery } from '@apollo/client';

const PUBLIC_FLAGS = gql`
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
  const { data, loading } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  if (loading && !data) return defaultValue;
  const list = data?.publicFeatureFlags ?? [];
  const flag = list.find((f) => f.key === key);
  if (!flag) return defaultValue;
  return flag.enabled === true;
}
