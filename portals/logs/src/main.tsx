import { mountWelcomePortal } from '@duncit/shell';
import {
  ADMIN_BUNDLE,
  AI_BUNDLE,
  ANALYTICS_BUNDLE,
  CLUB_ADMIN_BUNDLE,
  FINANCE_BUNDLE,
  flattenCatalogue,
  MARKETING_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  TECH_BUNDLE,
  WHATSAPP_BUNDLE,
} from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { logRoutes } from './routes';
import { EntityAnalyticsPage, LOGS_PAGE } from './log-pages';

/**
 * The Logs console, on logs.duncit.com: the Logs dashboard at `/`, plus every
 * other console's log pages (see ./log-pages).
 *
 * Those pages read their own consoles' copy keys — `tech.*`, `ai.*`, the
 * WhatsApp and marketing namespaces, `finance.*`, `legalAcceptanceLogs.*`, the
 * admin + club-admin keys Pod Monitoring reads, and `analytics.*` for the
 * dashboard. Shipping those bundles here is what compiles that copy into this
 * build and keeps it readable offline.
 */
mountWelcomePortal({
  appConfig,
  env: import.meta.env,
  logsPortal: logs.portal.logs,
  routes: logRoutes,
  home: <EntityAnalyticsPage page={LOGS_PAGE} />,
  i18nFallback: {
    ...flattenCatalogue(TECH_BUNDLE),
    ...flattenCatalogue(AI_BUNDLE),
    ...flattenCatalogue(WHATSAPP_BUNDLE),
    ...flattenCatalogue(MARKETING_BUNDLE),
    ...flattenCatalogue(FINANCE_BUNDLE),
    ...flattenCatalogue(POLICY_ACCEPTANCE_BUNDLE),
    ...flattenCatalogue(ADMIN_BUNDLE),
    ...flattenCatalogue(CLUB_ADMIN_BUNDLE),
    ...flattenCatalogue(ANALYTICS_BUNDLE),
  },
});
