import { Route } from 'react-router';
import { useFeatureFlag } from '@duncit/app-settings';
import {
  AUTO_PODS_PATH,
  AutoPodDetailsPage,
  AutoPodEditorPage,
  AutoPodsPage,
  EventTicketsPage,
  mountDirectoryPortal,
  PodChangeRequestsPage,
  PodDetailsPage,
  PodEditorPage,
  PodIdeasPage,
  PodMonitoringPage,
  PodPlansPage,
  PodSettingsPage,
  PodsDashboardPage,
  PodsPage,
  PODS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * Auto Pods are hidden while the `auto_pods` flag is off, so the console only
 * offers a route that resolves. This gate came with the Pods group out of the
 * admin portal — it is the feature's behaviour, not that portal's.
 */
function AutoPodsRoute({ page }: Readonly<{ page: React.ReactNode }>) {
  const enabled = useFeatureFlag('auto_pods');
  return enabled ? <>{page}</> : null;
}

/**
 * The pods console — admin's whole Pods group, on its own subdomain.
 *
 * Nine sidebar entries and thirteen routes, which is why a console hands over
 * its ROUTES and its NAV rather than a list and a detail: this one was never
 * shaped like the simple two.
 */
mountDirectoryPortal({
  appConfig,
  spec: PODS_SPEC,
  devPort: 2034,
  subdomain: 'pods',
  logsPortal: logs.portal.pods,
  console: {
    listPath: '/pods',
    nav: [
      {
        label: 'Pods',
        labelKey: 'shell.nav.pods',
        icon: 'calendar',
        children: [
          { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/pods/dashboard', icon: 'insights' },
          { label: 'All Pods', labelKey: 'shell.nav.allPods', to: '/pods', icon: 'calendar' },
          { label: 'Auto Pods', labelKey: 'shell.nav.autoPods', to: AUTO_PODS_PATH, icon: 'handshake' },
          { label: 'Change Requests', labelKey: 'changeRequest.sectionTitle', to: '/pods/change-requests', icon: 'rule' },
          { label: 'Pod Ideas', labelKey: 'shell.nav.podIdeas', to: '/pod-ideas', icon: 'insights' },
          { label: 'Pod Plans', labelKey: 'shell.nav.podPlans', to: '/pod-plans', icon: 'description' },
          { label: 'Event Tickets', labelKey: 'shell.nav.eventTickets', to: '/event-tickets', icon: 'ticket' },
          { label: 'Pod Settings', labelKey: 'shell.nav.podSettings', to: '/pod-settings', icon: 'tune' },
          { label: 'Pod Monitoring (AI)', labelKey: 'shell.nav.podMonitoringAi', to: '/pod-monitoring', icon: 'insights' },
        ],
      },
    ],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /pods/dashboard is never read as a pod id —
            React Router ranks it first either way, and the order says so. */}
        <Route path="/pods/dashboard" element={authed(<PodsDashboardPage />)} />
        <Route path="/pods/change-requests" element={authed(<PodChangeRequestsPage />)} />
        <Route path="/pods/new" element={authed(<PodEditorPage />)} />
        <Route path="/pods" element={authed(<PodsPage />)} />
        <Route path="/pods/:id" element={authed(<PodDetailsPage />)} />
        <Route path="/pods/:id/edit" element={authed(<PodEditorPage />)} />
        <Route path="/auto-pods" element={authed(<AutoPodsRoute page={<AutoPodsPage />} />)} />
        <Route path="/auto-pods/new" element={authed(<AutoPodsRoute page={<AutoPodEditorPage />} />)} />
        <Route path="/auto-pods/:id" element={authed(<AutoPodsRoute page={<AutoPodDetailsPage />} />)} />
        <Route path="/auto-pods/:id/edit" element={authed(<AutoPodsRoute page={<AutoPodEditorPage />} />)} />
        <Route path="/pod-settings" element={authed(<PodSettingsPage />)} />
        <Route path="/pod-monitoring" element={authed(<PodMonitoringPage />)} />
        <Route path="/event-tickets" element={authed(<EventTicketsPage />)} />
        <Route path="/pod-ideas" element={authed(<PodIdeasPage />)} />
        <Route path="/pod-plans" element={authed(<PodPlansPage />)} />
      </>
    ),
  },
});
