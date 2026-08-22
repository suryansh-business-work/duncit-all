import { mountPortal } from '@duncit/shell';
import { flattenCatalogue, STATUS_BUNDLE, TECH_BUNDLE } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { ConfirmProvider } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
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
  logsPortal: logs.portal.tech,
  // This portal's OWN namespace, layered over the shell chrome's. Shipping it
  // here is what compiles the copy into the build, so the server console and
  // the telemetry tables read correctly offline and before the API answers.
  // STATUS_BUNDLE too: the Status Reports table reads the same impact and
  // triage words the public status page writes them in, and one namespace for
  // both is what keeps the dropdown and the chip from drifting apart.
  i18nFallback: { ...flattenCatalogue(TECH_BUNDLE), ...flattenCatalogue(STATUS_BUNDLE) },
  loadUser: createSessionUserLoader(apolloClient),
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
