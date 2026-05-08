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
export function useFeatureFlag(key: string): boolean {
  const { data } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  const list = data?.publicFeatureFlags ?? [];
  return list.find((f) => f.key === key)?.enabled === true;
}
