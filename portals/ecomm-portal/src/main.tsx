import { mountPortal } from '@duncit/shell';
import { ECOMM_PORTAL_BUNDLE, PACKAGING_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * The E-commerce console, on ecomm-portal.duncit.com — the operators' side of
 * the Duncit Pet Store. Its copy is the `ecommPortal.*` namespace, shipped here
 * so every screen reads correctly before the Localization API answers.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: logs.portal['ecomm-portal'],
  // The shared Shipping & packaging section (parcel override) reads packaging.*.
  i18nFallback: { ...flattenCatalogue(ECOMM_PORTAL_BUNDLE), ...flattenCatalogue(PACKAGING_BUNDLE) },
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
