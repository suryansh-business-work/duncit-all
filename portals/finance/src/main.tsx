import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
// Via @duncit/app-settings, which already re-exports the i18n package — the
// portal gains the copy without gaining a dependency (and without the matching
// Dockerfile COPY that a new @duncit/* dep would silently require).
import { FINANCE_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
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
  logsPortal: logs.portal.finance,
  // This portal's OWN namespace, layered over the shell chrome's. Shipping it
  // here is what compiles the copy into the build, so the payment screens read
  // correctly offline and before the Localization API answers (rule 38).
  i18nFallback: flattenCatalogue(FINANCE_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  extras: <NotifyHost />,
  // Same arrangement as the other portals: useConfirm() needs this above the
  // routed pages, and the Pod Profit Calculator's delete is the first screen
  // here to ask for a confirmation (rule 12 — never window.confirm).
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
