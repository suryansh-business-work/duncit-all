import { mountPortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { ConfirmProvider } from './components/useConfirm';
import { NotifyHost } from './components/notify';
import { ADMIN_ME } from './adminSession';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: ADMIN_ME, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

mountPortal({
  config: {
    key: 'admin',
    name: 'Admin',
    tokenKey: 'admin_token',
    colorModeKey: 'admin_color_mode',
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  googleClientId: GOOGLE_CLIENT_ID,
  logsPortal: logs.portal.admin,
  loadUser,
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  extras: <NotifyHost />,
  children: <App />,
});
