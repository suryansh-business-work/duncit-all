import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { ConfirmProvider } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

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
  logsPortal: logs.portal['website-app'],
  loadUser: createSessionUserLoader(apolloClient),
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
