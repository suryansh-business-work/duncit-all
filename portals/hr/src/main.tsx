import { mountPortal } from '@duncit/shell';
import { flattenCatalogue, HR_BUNDLE } from '@duncit/app-settings';
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
  i18nFallback: flattenCatalogue(HR_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
