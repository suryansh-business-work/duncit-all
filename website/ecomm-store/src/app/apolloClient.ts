import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
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
    link: auth.concat(new HttpLink({ uri: GRAPHQL_URL })),
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
