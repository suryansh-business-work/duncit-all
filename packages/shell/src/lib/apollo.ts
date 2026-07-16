import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  from,
  type NormalizedCacheObject,
  type TypePolicies,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getOrCreateDuid } from '@duncit/utils';

const NETWORK_FAILURE_PATTERN = /failed to fetch|network request failed|load failed/i;
const FRIENDLY_NETWORK_MESSAGE = 'Unable to connect to server. Please check your internet connection and try again.';

/**
 * Rewrites raw browser transport failures ("Failed to fetch", …) into a
 * friendly, user-facing message. Previously carried as an identical
 * `utils/apolloErrorLink.ts` copy in all 17 portals; folded into
 * `createApolloClient` but also exported for clients built elsewhere (mWeb).
 */
export const apolloErrorLink = onError(({ networkError }) => {
  if (networkError && NETWORK_FAILURE_PATTERN.test(networkError.message)) {
    networkError.message = FRIENDLY_NETWORK_MESSAGE;
  }
});

export interface CreateApolloClientOptions {
  /** The server GraphQL endpoint (each portal's `urlConfigs.graphqlUrl`). */
  graphqlUrl: string;
  /** Auth-token accessor — pass the portal session's `getToken`. */
  getToken: () => string | null;
  /** Cache type policies; defaults to normalizing `User` by `user_id`. */
  typePolicies?: TypePolicies;
  /** Send the anonymous `x-duid` device header (default true; admin historically omits it). */
  includeDuid?: boolean;
}

/**
 * The Apollo client every portal previously carried as an identical
 * `src/apollo.ts` copy: HttpLink + Bearer/`x-duid` auth headers + transient
 * transport retry + friendly network-error rewrite.
 */
export function createApolloClient(options: Readonly<CreateApolloClientOptions>): ApolloClient<NormalizedCacheObject> {
  const { graphqlUrl, getToken, typePolicies, includeDuid = true } = options;

  const httpLink = new HttpLink({ uri: graphqlUrl });

  const authLink = setContext((_op, { headers }) => {
    const token = getToken();
    const duid = includeDuid ? getOrCreateDuid() : null;
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

  return new ApolloClient({
    link: from([apolloErrorLink, retryLink, authLink, httpLink]),
    cache: new InMemoryCache({
      // Normalize User by its `user_id` (the API's id field) so Apollo can merge
      // the `me` result with other User queries instead of warning about data loss.
      typePolicies: typePolicies ?? { User: { keyFields: ['user_id'] } },
    }),
  });
}
