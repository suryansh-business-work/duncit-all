import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
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

export function createStoreClient(): ApolloClient {
  const identity = clientIdentityHeaders('WEBSITE', APP_KEY);
  const auth = new SetContextLink((previous) => {
    const token = readStored(STORAGE_KEYS.token);
    return {
      headers: {
        ...previous.headers,
        ...identity,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });
  return new ApolloClient({
    // `trackingFetch` counts the requests in flight — what the top progress bar
    // in `App` reads, so every wait on the server shows without each page opting in.
    link: auth.concat(new HttpLink({ uri: GRAPHQL_URL, fetch: trackingFetch })),
    cache: new InMemoryCache({
      typePolicies: {
        User: { keyFields: ['user_id'] },
        StoreFacetPanel: UNNORMALISED,
        StoreBrandCount: UNNORMALISED,
        StorePetCount: UNNORMALISED,
        StoreCart: { fields: { lines: { merge: false } } },
      },
    }),
  });
}
