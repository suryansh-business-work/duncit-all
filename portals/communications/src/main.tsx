import { mountPortal } from '@duncit/shell';
import {
  flattenCatalogue,
  MARKETING_BUNDLE,
  TECH_BUNDLE,
  WHATSAPP_BUNDLE,
} from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * The Communications console, on communications.duncit.com.
 *
 * Its screens came from other consoles and kept their copy keys, so the
 * translations already made for them still apply: the email, Slack and MSG91
 * pages read `tech.*`, and WhatsApp reads `marketing.whatsappCampaigns.*` plus
 * its own WhatsApp namespace. Shipping those bundles here is what compiles that
 * copy into this build.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: logs.portal.communications,
  i18nFallback: {
    ...flattenCatalogue(TECH_BUNDLE),
    ...flattenCatalogue(MARKETING_BUNDLE),
    ...flattenCatalogue(WHATSAPP_BUNDLE),
  },
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
