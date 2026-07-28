import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { ConfirmProvider } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

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
  logsPortal: logs.portal['website-app'],
  loadUser: createSessionUserLoader(apolloClient),
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
