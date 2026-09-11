import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
// Via @duncit/app-settings, which already re-exports the i18n package — the
// portal gains the copy without gaining a dependency (and without the matching
// Dockerfile COPY that a new @duncit/* dep would silently require).
import { EMPLOYEE_EXPENSE_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.employee,
  // The claim copy this console shares with the Finance queue that decides on
  // it, layered over the shell chrome (rule 38).
  i18nFallback: flattenCatalogue(EMPLOYEE_EXPENSE_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
