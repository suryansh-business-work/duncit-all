import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
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

export const apolloClient = new ApolloClient({
  link: from([apolloErrorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
