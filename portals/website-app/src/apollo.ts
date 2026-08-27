import { createApolloClient } from '@duncit/shell';
import { appConfig } from './config/app-config';
import { urlConfigs } from './config/url-configs';
import { getToken } from './lib/session';

export const apolloClient = createApolloClient({
  graphqlUrl: urlConfigs.graphqlUrl,
  getToken,
  // Names this console for the platform rate limiter, so it can carry its
  // own ceiling instead of sharing one with the other sixteen.
  app: appConfig.key,
});
