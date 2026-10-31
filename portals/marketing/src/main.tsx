import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import {
  AI_BUNDLE,
  ANALYTICS_BUNDLE,
  flattenCatalogue,
  MAIL_PREFERENCE_BUNDLE,
  MARKETING_BUNDLE,
  TECH_BUNDLE,
} from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { appConfig } from './config/app-config';
import App from './App';

mountPortal({
  config: appConfig,
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal.marketing,
  // This portal's OWN namespaces, layered over the shell's. The mail-category
  // names on the analytics page are the SAME sentences mWeb and the native app
  // render on Mail Preference (rule 40) — one bundle, three surfaces, so a
  // category cannot be called two different things in two places.
  i18nFallback: {
    // This portal's OWN namespace, layered over the shell chrome's.
    ...flattenCatalogue(MARKETING_BUNDLE),
    ...flattenCatalogue(MAIL_PREFERENCE_BUNDLE),
    // Contacts is the Analytics console's Contacts page.
    ...flattenCatalogue(ANALYTICS_BUNDLE),
    // Instagram Leads › Settings edits the Serper key with the Tech console's
    // own Environment Variables editor, which reads `tech.*`.
    ...flattenCatalogue(TECH_BUNDLE),
    // Reel Studio moved here from the AI console and kept its `ai.reels.*`
    // keys, so the copy every deployment already translated still resolves.
    ...flattenCatalogue(AI_BUNDLE),
  },
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
