import { createApolloClient } from '@duncit/shell';
import { urlConfigs } from './config/url-configs';
import { getToken } from './lib/session';

export const apolloClient = createApolloClient({ graphqlUrl: urlConfigs.graphqlUrl, getToken });
