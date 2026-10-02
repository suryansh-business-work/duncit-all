import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { SOCIAL_SETUP, type SocialAccount, type SocialProviderStatus } from './queries';
import { useConnectResult } from './useConnectResult';

const NO_PROVIDERS: SocialProviderStatus[] = [];
const NO_ACCOUNTS: SocialAccount[] = [];

interface SetupData {
  socialProviders: SocialProviderStatus[];
  socialAccounts: SocialAccount[];
}

/**
 * Which networks Tech has set up and which accounts are connected — what both
 * Social Accounts and Social Calendar start from. It also announces the result
 * of a connection the OAuth callback just brought the marketer back from.
 */
export function useSocialSetup() {
  const { data, loading, error, refetch } = useQuery<SetupData>(SOCIAL_SETUP, { fetchPolicy: 'cache-and-network' });

  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  useConnectResult(reload);

  return {
    providers: data?.socialProviders ?? NO_PROVIDERS,
    accounts: data?.socialAccounts ?? NO_ACCOUNTS,
    loading: loading && !data,
    error,
    reload,
  };
}
