import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { CHALLENGE_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
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
  logsPortal: logs.portal['challenge-portal'],
  // The challenges console's own namespace, layered over the shell chrome's.
  // The leaderboard screens need nothing here: their copy is `shell.*`, which
  // the shell already ships (rule 38).
  i18nFallback: flattenCatalogue(CHALLENGE_BUNDLE),
  loadUser: createSessionUserLoader(apolloClient),
  children: <App />,
});
