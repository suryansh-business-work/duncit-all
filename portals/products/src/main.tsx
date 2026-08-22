import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { NotifyHost } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { flattenCatalogue, PRODUCTS_BUNDLE } from '@duncit/app-settings';
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
  logsPortal: logs.portal.products,

  // This console's OWN namespace, layered over the shell chrome's (rule 38).

  i18nFallback: flattenCatalogue(PRODUCTS_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  extras: <NotifyHost />,
  children: <App />,
});
