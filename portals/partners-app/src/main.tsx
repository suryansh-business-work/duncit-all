import { mountPortal } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { appConfig } from './config/app-config';
import { apolloClient } from './apollo';
import { PARTNERS_FALLBACK } from './i18n';
import { PARTNERS_ACCENT } from './theme';
import App from './App';
import 'react-datepicker/dist/react-datepicker.css';

mountPortal({
  config: {
    key: appConfig.key,
    name: appConfig.name,
    tokenKey: appConfig.tokenKey,
    colorModeKey: appConfig.colorModeKey,
    accent: PARTNERS_ACCENT,
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  logsPortal: logs.portal['partners-app'],
  loadUser: createSessionUserLoader(apolloClient, { operationName: 'PartnerSessionMe' }),
  userStorageKey: 'partner_user',
  // Via @duncit/app-settings, which already re-exports the i18n package — the
  // portal gains the copy without gaining a dependency (and without the
  // matching Dockerfile COPY that a new @duncit/* dep would silently require).
  i18nFallback: PARTNERS_FALLBACK,
  // The pod and club editors are pages now: they navigate back to their list on
  // save, so the confirmation has to outlive the screen that triggered it.
  extras: <NotifyHost />,
  children: <App />,
});
