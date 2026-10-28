import { mountPortal } from '@duncit/shell';
import {
  ANALYTICS_BUNDLE,
  flattenCatalogue,
  TECH_BUNDLE,
  TESTS_BUNDLE,
  TESTS_MANUAL_BUNDLE,
  TESTS_UNIT_BUNDLE,
} from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { appConfig } from './config/app-config';
import { testsLog } from './lib/logger';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * The Tests console, on tests.duncit.com: the confidence dashboard, unit,
 * E2E, stress and regression runs, the manual test board, code quality and
 * the platform's own monitoring (telemetry, error boundaries, GraphQL).
 *
 * Its own copy is the `tests`, `testsUnit` and `testsManual` namespaces. The
 * E2E, stress, telemetry and GraphQL pages moved here from Tech with their
 * `tech.*` keys unchanged, and Code Quality → SonarQube is the Analytics
 * console's own dashboard — shipping both bundles is what keeps that copy
 * readable offline and before the API answers.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: testsLog,
  i18nFallback: {
    ...flattenCatalogue(TECH_BUNDLE),
    ...flattenCatalogue(ANALYTICS_BUNDLE),
    ...flattenCatalogue(TESTS_BUNDLE),
    ...flattenCatalogue(TESTS_UNIT_BUNDLE),
    ...flattenCatalogue(TESTS_MANUAL_BUNDLE),
  },
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
