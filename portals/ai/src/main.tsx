import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { AI_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
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
  logsPortal: logs.portal.ai,
  // This console's OWN namespace, layered over the shell chrome's. The
  // aiMonitoring.* notice copy is separate — it renders on every surface, not
  // only here (rule 38).
  i18nFallback: flattenCatalogue(AI_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
