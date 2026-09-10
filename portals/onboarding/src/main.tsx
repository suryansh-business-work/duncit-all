import { mountPortal } from '@duncit/shell';
import { flattenCatalogue, ONBOARDING_BUNDLE } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.onboarding,
  // This portal's OWN namespace, layered over the shell chrome's. Shipping it
  // here is what compiles the copy into the build, so the onboarding queues
  // read correctly offline and before the Localization API answers.
  i18nFallback: flattenCatalogue(ONBOARDING_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
