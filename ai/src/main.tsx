import { gql } from '@apollo/client';
import { mountPortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const ME_QUERY = gql`
  query SessionMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      roles
      profile_photo
    }
  }
`;

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

mountPortal({
  config: {
    key: appConfig.key,
    name: appConfig.name,
    tokenKey: appConfig.tokenKey,
    colorModeKey: appConfig.colorModeKey,
    accent: appConfig.accent,
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  googleClientId: GOOGLE_CLIENT_ID,
  logsPortal: logs.portal.ai,
  loadUser,
  children: <App />,
});
