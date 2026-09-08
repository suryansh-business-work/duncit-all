import { mountPortal } from '@duncit/shell';
import { ConfirmProvider } from '@duncit/dialogs';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import { REGIONAL_FALLBACK } from './i18n';
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
  logsPortal: logs.portal['regional-club-admin'],
  // This console's own namespace, layered over the shell chrome's (rule 38).
  i18nFallback: REGIONAL_FALLBACK,
  loadUser: createSessionUserLoader(apolloClient),
  // The pod detail page's sections call useConfirm(); without a provider above
  // the routes the first confirmation throws instead of opening.
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
