import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { RetryLink } from '@apollo/client/link/retry';
import { getOrCreateDuid } from './duid';
import { urlConfigs } from './config/url-configs';
import { apolloErrorLink } from './utils/apolloErrorLink';
import { getToken } from './lib/session';

const httpLink = new HttpLink({ uri: urlConfigs.graphqlUrl });

const authLink = setContext((_op, { headers }) => {
  const token = getToken();
  const duid = getOrCreateDuid();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(duid ? { 'x-duid': duid } : {}),
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
    retryIf: (error) => {
      if (!error) return false;
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
    // Normalize User by its `user_id` (the API's id field) so Apollo can merge
    // the `me` result with other User queries instead of warning about data loss.
    typePolicies: { User: { keyFields: ['user_id'] } },
  }),
});
