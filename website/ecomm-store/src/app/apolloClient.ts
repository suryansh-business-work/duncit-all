import { ApolloClient, HttpLink, InMemoryCache, type NormalizedCacheObject } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { trackingFetch } from '@duncit/ui';
import { clientIdentityHeaders } from '@duncit/user-core';

import { APP_KEY, GRAPHQL_URL } from '../config/env';
import { STORAGE_KEYS, readStored } from '../lib/storage';

/**
 * Filter counts belong to ONE search: two shelves share a facet id but not its
 * counts, so normalising them would let one shelf overwrite the other's.
 */
const UNNORMALISED = { keyFields: false as const };

interface StoreClientOptions {
  /** The server render's cache, handed over in the page, so hydration starts from the same data. */
  initialState?: NormalizedCacheObject;
  /** Set on the server: where its GraphQL calls go. The server renders signed out, so no token is sent. */
  ssrUri?: string;
}

/**
 * After hydration, cache-and-network queries would at once re-ask what the
 * server just answered; this long, they read the handed-over cache instead.
 */
const SSR_FORCE_FETCH_DELAY_MS = 100;

export function createStoreClient({ initialState, ssrUri }: StoreClientOptions = {}): ApolloClient {
  const identity = clientIdentityHeaders('WEBSITE', APP_KEY);
  const auth = new SetContextLink((previous) => {
    const token = ssrUri ? null : readStored(STORAGE_KEYS.token);
    return {
      headers: {
        ...previous.headers,
        ...identity,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });
  const cache = new InMemoryCache({
    typePolicies: {
      User: { keyFields: ['user_id'] },
      StoreFacetPanel: UNNORMALISED,
      StoreBrandCount: UNNORMALISED,
      StorePetCount: UNNORMALISED,
      StoreCart: { fields: { lines: { merge: false } } },
    },
  });
  if (initialState) cache.restore(initialState);
  return new ApolloClient({
    // `trackingFetch` counts the requests in flight. The top progress bar
    // in `App` reads that count, so every wait on the server shows without each page opting in.
    // The server's own calls stay out of that count: it is the browser's progress bar.
    link: auth.concat(new HttpLink(ssrUri ? { uri: ssrUri } : { uri: GRAPHQL_URL, fetch: trackingFetch })),
    cache,
    ...(ssrUri ? { ssrMode: true } : { ssrForceFetchDelay: initialState ? SSR_FORCE_FETCH_DELAY_MS : 0 }),
  });
}
