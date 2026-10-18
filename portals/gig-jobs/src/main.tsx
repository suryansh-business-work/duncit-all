import { mountWelcomePortal } from '@duncit/shell';
import { flattenCatalogue, GIG_JOBS_BUNDLE } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';
import { gigRoutes } from './routes';
import GigDashboardPage from './pages/dashboard/GigDashboardPage';

/**
 * The Gig Jobs console, on gig-jobs.duncit.com: staff moderate every gig
 * hosts, venue owners and brand owners post, see who is interested, browse
 * the freelancers who joined from Earn with Duncit, and keep the categories.
 * Its copy is the `gigJobs` namespace the member surfaces share.
 */
mountWelcomePortal({
  appConfig,
  env: import.meta.env,
  logsPortal: logs.portal['gig-jobs'],
  routes: gigRoutes,
  home: <GigDashboardPage />,
  i18nFallback: flattenCatalogue(GIG_JOBS_BUNDLE),
});
