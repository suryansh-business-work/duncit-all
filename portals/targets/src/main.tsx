import { mountWelcomePortal } from '@duncit/shell';
import { flattenCatalogue, TARGETS_BUNDLE } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { targetsRoutes } from './routes';

/**
 * The Targets console, on targets.duncit.com: the welcome dashboard and the
 * Growth Calculator, where planners turn assumptions into pod, revenue and
 * lead targets and keep the runs they save.
 *
 * `targets.*` is compiled into this build so the console reads offline and
 * before the Localization API answers.
 */
mountWelcomePortal({
  appConfig,
  env: import.meta.env,
  logsPortal: logs.portal.targets,
  routes: targetsRoutes,
  i18nFallback: flattenCatalogue(TARGETS_BUNDLE),
});
