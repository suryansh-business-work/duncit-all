import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { CRM_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import { dataGrid } from './theme';
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
  logsPortal: logs.portal.crm,

  // This console's OWN namespace, layered over the shell chrome's (rule 38).

  i18nFallback: flattenCatalogue(CRM_BUNDLE),
  loadUser,
  themeExtend: dataGrid,
  children: <App />,
});
