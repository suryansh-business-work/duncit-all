import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { trackingFetch } from '@duncit/ui';
import { clientIdentityHeaders } from '@duncit/user-core';
import { APP_KEY, GRAPHQL_URL } from './env';
import { readStored } from './storage';

/**
 * One Apollo client per page, keyed on the storage slot its session token lives
 * in (the web app and the console sign in separately). `trackingFetch` feeds
 * the request progress bar, exactly as the other Duncit surfaces do.
 */
export function createLiteClient(tokenKey: string, surface: 'WEBSITE' | 'PORTAL'): ApolloClient {
  const identity = clientIdentityHeaders(surface, APP_KEY);
  const auth = new SetContextLink((previous) => {
    const token = readStored(tokenKey);
    return { headers: { ...previous.headers, ...identity, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
  });
  return new ApolloClient({
    link: auth.concat(new HttpLink({ uri: GRAPHQL_URL, fetch: trackingFetch })),
    cache: new InMemoryCache({
      typePolicies: {
        LiteEvent: { keyFields: ['id'] },
        LiteRegistration: { keyFields: ['id'] },
        LiteCalendar: { keyFields: ['id'] },
        LiteUser: { keyFields: ['id'] },
        LiteEventStats: { keyFields: false },
        LiteDiscover: { keyFields: false },
      },
    }),
  });
}
