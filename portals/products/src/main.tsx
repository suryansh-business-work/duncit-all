import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { flattenCatalogue, PACKAGING_BUNDLE, PRODUCTS_BUNDLE } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.products,

  // This console's OWN namespace, layered over the shell chrome's (rule 38),
  // plus the shared "Shipping & packaging" section the product page renders.

  i18nFallback: { ...flattenCatalogue(PRODUCTS_BUNDLE), ...flattenCatalogue(PACKAGING_BUNDLE) },
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
