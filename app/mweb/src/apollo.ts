import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { RetryLink } from '@apollo/client/link/retry';
import { getMainDefinition } from '@apollo/client/utilities';
import {
  NO_REDIS_HEADER,
  SURFACE_HEADER,
  getOrCreateDuid,
  resolveNoRedisFlag,
} from '@duncit/user-core';
import { urlConfigs } from './config/url-configs';
import { apolloErrorLink } from './utils/apolloErrorLink';

const httpLink = new HttpLink({
  uri: urlConfigs.graphqlUrl,
});

const authLink = setContext((_op, { headers }) => {
  const token = localStorage.getItem('token');
  const duid = getOrCreateDuid();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(duid ? { 'x-duid': duid } : {}),
      // Names this surface on the server, which stamps it onto the admin user
      // change log — mWeb and the native app are otherwise indistinguishable.
      [SURFACE_HEADER]: 'MWEB',
      // `?noRedis=true` in the URL: skip the server's Redis response cache
      // for every request from this tab (sticky until ?noRedis=false).
      ...(resolveNoRedisFlag() ? { [NO_REDIS_HEADER]: 'true' } : {}),
    },
  };
});

// Transparently retry transient transport failures — offline blips and 5xx
// responses (e.g. the brief 502 window while the API container restarts during
// a deploy) — so session queries like `me` never surface a hard error.
// GraphQL-level results (including `me: null`) are NOT network errors, so they
// are never retried here.
const retryLink = new RetryLink({
  delay: { initial: 400, max: 4000, jitter: true },
  attempts: {
    max: 6,
    retryIf: (error, operation) => {
      if (!error) return false;
      // Never retry mutations. They are not guaranteed idempotent, so a retry
      // after a transport blip — when the write may already have succeeded on
      // the server — could duplicate a charge / pod / payout. Only safe,
      // side-effect-free queries ride out transient failures.
      const definition = getMainDefinition(operation.query);
      if (definition.kind === 'OperationDefinition' && definition.operation === 'mutation') {
        return false;
      }
      const status =
        (error as { statusCode?: number; response?: { status?: number } }).statusCode ??
        (error as { response?: { status?: number } }).response?.status;
      if (typeof status === 'number') return status === 0 || status >= 500;
      return true; // no HTTP status => transport/offline error => retry
    },
  },
});

export const apolloClient = new ApolloClient({
  link: from([apolloErrorLink, retryLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // The API identifies users by `user_id` (not `id`/`_id`), so Apollo can't
      // normalize User objects on its own. Without this it can't merge the `me`
      // result with other User-returning queries and warns about possible data
      // loss (Apollo error #15). Normalising on user_id fixes the merge.
      User: { keyFields: ['user_id'] },
      // Branding is a single un-id'd config object; without a merge policy Apollo
      // warns about possible data loss when two queries return different Branding
      // shapes. Replace the whole field on each fetch (no normalization needed).
      Branding: { keyFields: false },
      Query: {
        fields: {
          branding: { merge: (_existing, incoming) => incoming },
        },
      },
    },
  }),
});
