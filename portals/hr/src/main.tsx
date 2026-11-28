import { mountPortal } from '@duncit/shell';
import { EMPLOYEE_TARGETS_BUNDLE, flattenCatalogue, HR_BUNDLE, HR_EMPLOYEE_BUNDLE } from '@duncit/app-settings';
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
  logsPortal: logs.portal.hr,
  // Team Structure, the employee records it shares with the Employee console, and
  // the monthly-target labels its profiles show from the Targets console.
  i18nFallback: { ...flattenCatalogue(HR_BUNDLE), ...flattenCatalogue(HR_EMPLOYEE_BUNDLE), ...flattenCatalogue(EMPLOYEE_TARGETS_BUNDLE) },
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
