import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { urlConfigs } from './config/url-configs';
import { apolloErrorLink } from './utils/apolloErrorLink';

const httpLink = new HttpLink({
  uri: urlConfigs.graphqlUrl,
});

const authLink = setContext((_op, { headers }) => {
  const token = localStorage.getItem('admin_token');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([apolloErrorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
