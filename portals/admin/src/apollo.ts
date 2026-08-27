import { createApolloClient } from '@duncit/shell';
import { appConfig } from './config/app-config';
import { urlConfigs } from './config/url-configs';

// Admin historically reads the raw token key directly and does NOT send the
// anonymous x-duid header — both preserved via the factory options.
export const apolloClient = createApolloClient({
  graphqlUrl: urlConfigs.graphqlUrl,
  getToken: () => localStorage.getItem('admin_token'),
  includeDuid: false,
  // Every write from this console is filed against the user it edits as
  // "Admin Portal" in their change log.
  surface: 'ADMIN_PORTAL',
  // Names this console for the platform rate limiter (x-duncit-app).
  app: appConfig.key,
});
