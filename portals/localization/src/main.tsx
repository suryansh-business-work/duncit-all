import { mountWelcomePortal } from '@duncit/shell';
import { flattenCatalogue, LOCALIZATION_BUNDLE } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { localizationRoutes } from './routes';

/**
 * The Localization console, on localization.duncit.com: the languages Duncit
 * ships in (Locales) and every string across it (Translations), with AI
 * translation running as a background job the header follows.
 *
 * `localization.*` is compiled into this build so the console reads offline
 * and before the API answers.
 */
mountWelcomePortal({
  appConfig,
  env: import.meta.env,
  logsPortal: logs.portal.localization,
  routes: localizationRoutes,
  i18nFallback: flattenCatalogue(LOCALIZATION_BUNDLE),
});
