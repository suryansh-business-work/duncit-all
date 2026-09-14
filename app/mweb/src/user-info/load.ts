import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { apolloClient } from '../apollo';
import { endRejectedSession } from '../lib/session-guard';
import { USER_INFO, type UserInfoMe } from './queries';

/** The server refusing the token, as opposed to failing to answer at all. */
function isRefused(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')
  );
}

/**
 * The provider's loader: one network read of USER_INFO, written to the cache
 * every reader answers from.
 *
 * A refused session ends here. `me` alone used to say so by answering null; the
 * balance beside it now answers UNAUTHENTICATED instead, and being non-null it
 * takes the whole payload down with it — so the refusal is read off the error
 * code. Any other failure is thrown, which the provider treats as a transient
 * blip and rides out on the cached user.
 */
export async function loadUserInfo(): Promise<UserInfoMe | null> {
  const { data, error } = await apolloClient.query({
    query: USER_INFO,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });
  const me = data?.me ?? null;
  if (me) return me;
  if (error && !isRefused(error)) throw error;
  endRejectedSession();
  return null;
}
