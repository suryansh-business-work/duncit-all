import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { ConfirmProvider } from '@duncit/dialogs';
import { flattenCatalogue, MAIL_PREFERENCE_BUNDLE } from '@duncit/app-settings';
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
  logsPortal: logs.portal.marketing,
  // This portal's OWN namespace, layered over the shell's. The mail-category
  // names on the analytics page are the SAME sentences mWeb and the native app
  // render on Mail Preference (rule 40) — one bundle, three surfaces, so a
  // category cannot be called two different things in two places.
  i18nFallback: flattenCatalogue(MAIL_PREFERENCE_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  wrap: (node) => <ConfirmProvider>{node}</ConfirmProvider>,
  children: <App />,
});
