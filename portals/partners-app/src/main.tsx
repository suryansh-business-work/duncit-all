import { gql } from '@apollo/client';
import { mountPortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { PARTNERS_ACCENT } from './theme';
import App from './App';
import 'react-datepicker/dist/react-datepicker.css';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const PARTNER_ME = gql`
  query PartnerSessionMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      profile_photo
      roles
    }
  }
`;

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: PARTNER_ME, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

mountPortal({
  config: {
    key: 'partners',
    name: 'Partners App',
    tokenKey: 'token',
    colorModeKey: 'partners_color_mode',
    accent: PARTNERS_ACCENT,
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  googleClientId: GOOGLE_CLIENT_ID,
  logsPortal: logs.portal['partners-app'],
  loadUser,
  userStorageKey: 'partner_user',
  children: <App />,
});
