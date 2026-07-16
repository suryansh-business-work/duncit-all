import { createApolloClient } from '@duncit/shell';
import { urlConfigs } from './config/url-configs';

// Admin historically reads the raw token key directly and does NOT send the
// anonymous x-duid header — both preserved via the factory options.
export const apolloClient = createApolloClient({
  graphqlUrl: urlConfigs.graphqlUrl,
  getToken: () => localStorage.getItem('admin_token'),
  includeDuid: false,
});
