import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { NotifyHost } from '@duncit/dialogs';
import { CONTENT_REPORT_BUNDLE, flattenCatalogue, POLICY_ACCEPTANCE_BUNDLE } from '@duncit/app-settings';
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
  logsPortal: logs.portal.legal,
  // This portal's OWN namespace, layered over the shell's. The acceptance log
  // reads back the same gate mWeb and the native app render at signup (rule
  // 40), so one bundle serves all three — a policy called one thing at signup
  // and another in the audit table is exactly what an auditor cannot have.
  i18nFallback: flattenCatalogue({ ...POLICY_ACCEPTANCE_BUNDLE, ...CONTENT_REPORT_BUNDLE }),
  loadUser: createSessionUserLoader(apolloClient),
  extras: <NotifyHost />,
  children: <App />,
});
