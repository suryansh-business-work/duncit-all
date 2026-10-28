import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
// Via @duncit/app-settings, which already re-exports the i18n package — the
// portal gains the copy without gaining a dependency.
import { LOYALTY_CONSOLE_CATALOGUE, flattenCatalogue } from '@duncit/app-settings';
import { appConfig } from './config/app-config';
import { urlConfigs } from './config/url-configs';
import { runtime } from './runtime';
import App from './App';

/**
 * The Loyalty console, on loyalty.duncit.com: Duncit Coin, virtual gift cards
 * and printed (physical) gift cards. Its copy is the `loyalty` namespace plus the
 * `finance.*` branches the coin and virtual card screens brought with them.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.loyalty,
  i18nFallback: flattenCatalogue(LOYALTY_CONSOLE_CATALOGUE),
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
