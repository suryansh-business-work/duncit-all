import { ApolloClient, HttpLink, InMemoryCache, type NormalizedCacheObject } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { trackingFetch } from '@duncit/ui';
import { clientIdentityHeaders } from '@duncit/user-core';
import { APP_KEY, GRAPHQL_URL } from './env';
import { readStored } from './storage';

export interface LiteClientOptions {
  /** The server render's cache, so the browser starts from what was already drawn. */
  initialState?: unknown;
  /**
   * Server render only: query this absolute URL with this token. The browser
   * reads its token from storage on every request instead.
   */
  ssr?: { uri: string; token: string | null };
}

const cache = (initialState: unknown) =>
  new InMemoryCache({
    typePolicies: {
      LiteEvent: { keyFields: ['id'] },
      LiteRegistration: { keyFields: ['id'] },
      LiteCalendar: { keyFields: ['id'] },
      LiteUser: { keyFields: ['id'] },
      LiteEventStats: { keyFields: false },
      LiteDiscover: { keyFields: false },
    },
  }).restore((initialState ?? {}) as NormalizedCacheObject);

/**
 * One Apollo client per page, keyed on the storage slot its session token lives
 * in (the web app and the console sign in separately). `trackingFetch` feeds
 * the request progress bar, exactly as the other Duncit surfaces do.
 */
export function createLiteClient(tokenKey: string, surface: 'WEBSITE' | 'PORTAL', options: LiteClientOptions = {}): ApolloClient {
  const identity = clientIdentityHeaders(surface, APP_KEY);
  const { ssr } = options;
  const auth = new SetContextLink((previous) => {
    const token = ssr ? ssr.token : readStored(tokenKey);
    return { headers: { ...previous.headers, ...identity, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
  });
  return new ApolloClient({
    ssrMode: Boolean(ssr),
    link: auth.concat(new HttpLink({ uri: ssr?.uri ?? GRAPHQL_URL, fetch: ssr ? globalThis.fetch : trackingFetch })),
    cache: cache(options.initialState),
  });
}
