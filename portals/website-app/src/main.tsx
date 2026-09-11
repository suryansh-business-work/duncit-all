import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { flattenCatalogue, WEBSITE_APP_BUNDLE } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal['website-app'],

  // This console's OWN namespace, layered over the shell chrome's (rule 38).

  i18nFallback: flattenCatalogue(WEBSITE_APP_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
