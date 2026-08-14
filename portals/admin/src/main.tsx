// Admin additionally uses Open Sans (alongside the shell's Nunito) — self-hosted
// to drop the Google Fonts <link> in index.html.
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/800.css';
import { mountPortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { flattenCatalogue, WHATSAPP_BUNDLE } from '@duncit/app-settings';
import { urlConfigs } from './config/url-configs';
import { appConfig } from './config/app-config';
import { apolloClient } from './apollo';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { createSessionUserLoader } from '@duncit/user-context';
import { ADMIN_ME } from './adminSession';
import App from './App';

const loadUser = createSessionUserLoader(apolloClient, { query: ADMIN_ME });

mountPortal({
  config: {
    key: appConfig.key,
    name: appConfig.name,
    tokenKey: appConfig.tokenKey,
    colorModeKey: appConfig.colorModeKey,
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.admin,
  // The WhatsApp console names a scenario row with the SAME category sentences
  // mWeb and the native app render on WhatsApp Preference (rule 40) — one
  // bundle, three surfaces, so `reminder` cannot be called two different things.
  i18nFallback: flattenCatalogue(WHATSAPP_BUNDLE),
  loadUser,
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  extras: <NotifyHost />,
  children: <App />,
});
