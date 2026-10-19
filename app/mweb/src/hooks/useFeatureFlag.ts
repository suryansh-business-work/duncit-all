import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

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

/** The server's public flag set, or undefined until it has loaded. */
export function usePublicFeatureFlags(): PublicFlag[] | undefined {
  const { data } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  return data?.publicFeatureFlags;
}

/**
 * Reads the server's public feature-flag set and returns whether the given
 * key is enabled. Defaults to `false` while loading or when the flag is
 * missing on the server.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const flag = (usePublicFeatureFlags() ?? []).find((f) => f.key === key);
  if (!flag) return defaultValue;
  return flag.enabled === true;
}
