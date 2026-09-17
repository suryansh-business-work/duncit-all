import { mountPortal } from '@duncit/shell';
import { ANALYTICS_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * The Analytics console, on analytics.duncit.com — charts and short rankings
 * for pods, clubs, club admins and hosts. Its copy is the `analytics.*`
 * namespace, shipped here so the pages read correctly before the
 * Localization API answers.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: logs.portal.analytics,
  i18nFallback: flattenCatalogue(ANALYTICS_BUNDLE),
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
