import { mountPortal } from '@duncit/shell';
import { flattenCatalogue, INTEL_BUNDLE } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { appConfig } from './config/app-config';
import { intelLog } from './lib/logger';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * Duncit Intel, on intel.duncit.com: chat with company knowledge, the Media
 * Manager, knowledge and sync dashboards, approvals and settings. Its copy is
 * the `intel` namespace — shipped as the fallback so the console reads well
 * offline and before the API answers; the server's copy wins when present.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: intelLog,
  i18nFallback: flattenCatalogue(INTEL_BUNDLE),
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
