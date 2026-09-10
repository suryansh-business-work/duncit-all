import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { flattenCatalogue, SUPPORT_BUNDLE } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

const loadUser = createSessionUserLoader(apolloClient);

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
  logsPortal: logs.portal.support,

  // This console's OWN namespace, layered over the shell chrome's (rule 38).

  i18nFallback: flattenCatalogue(SUPPORT_BUNDLE),
  loadUser,
  children: <App />,
});
