import { mountPortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { appConfig } from './config/app-config';
import { apolloClient } from './apollo';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { createSessionUserLoader } from '@duncit/user-context';
import { ADMIN_ME } from './adminSession';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const loadUser = createSessionUserLoader(apolloClient, { query: ADMIN_ME });

mountPortal({
  config: {
    key: appConfig.key,
    name: appConfig.name,
    tokenKey: appConfig.tokenKey,
    colorModeKey: appConfig.colorModeKey,
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
