import { useQuery } from '@apollo/client/react';
import { USER_INFO } from './queries';

/**
 * The signed-in account, its coin balance and the menu's policy links, read
 * from the cache the provider's `loadUserInfo` filled.
 *
 * `cache-first` is the whole point: a mount never asks again. On a cold page
 * load this read and the provider's are the same document in flight at once,
 * so Apollo sends them as one request. Signed out there is nothing to read, and
 * asking would only collect an UNAUTHENTICATED error for the balance.
 */
export function useUserInfo() {
  const signedIn = !!localStorage.getItem('token');
  const { data, loading, error } = useQuery(USER_INFO, {
    fetchPolicy: 'cache-first',
    skip: !signedIn,
  });
  return {
    me: data?.me ?? undefined,
    coinBalance: data?.myCoinBalance,
    policies: data?.publicPolicies ?? [],
    loading: loading && !data,
    /** Answered, failed, or nothing to ask — what the header waits on to pick a city. */
    settled: !signedIn || data !== undefined || error !== undefined,
  };
}
