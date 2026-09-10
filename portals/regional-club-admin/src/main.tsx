import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import { REGIONAL_FALLBACK } from './i18n';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal['regional-club-admin'],
  // This console's own namespace, layered over the shell chrome's (rule 38).
  i18nFallback: REGIONAL_FALLBACK,
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
