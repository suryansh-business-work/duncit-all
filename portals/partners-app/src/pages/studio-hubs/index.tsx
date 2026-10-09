/**
 * The studio sidebar groups, each drawn as ONE page with a tab strip over the
 * EXISTING pages (nothing re-implemented, nothing removed). Every tab is still
 * its own route — the same one its sidebar sub-entry opens — so App.tsx points
 * each of those routes at its group's hub, and the hub opens on that tab.
 */
import { useFeatureFlag } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import StudioHub, { type StudioHubTab } from '../../components/studio/StudioHub';
import HostPodsPage from '../host-pods-page/HostPodsPage';
import HostAutoPodsPage from '../host-auto-pods-page/HostAutoPodsPage';
import PodRequestsPage from '../pod-requests/PodRequestsPage';
import ChangeRequestsPage from '../change-requests-page';
import VenueListingsPage from '../venue-listings-page/VenueListingsPage';
import VenueSettingsPage from '../venue-settings-page/VenueSettingsPage';
import SlotRequestsPage from '../slot-requests-page/SlotRequestsPage';
import VenuePodsPage from '../venue-pods-page/VenuePodsPage';
import VenueAutoPodsPage from '../venue-auto-pods-page/VenueAutoPodsPage';
import ClubAdminClubsPage from '../club-admin-clubs-page/ClubAdminClubsPage';
import ClubAdminAutoPodsPage from '../club-admin-auto-pods-page/ClubAdminAutoPodsPage';
import ClubAdminPodMonitoringPage from '../club-admin-monitoring-page/ClubAdminPodMonitoringPage';
import PartnerFaqsPage from '../PartnerFaqsPage';
import SupportPage from '../support-page/SupportPage';
import PartnerPoliciesPage from '../policies-page/PartnerPoliciesPage';

/** Drops the Auto Pods tab while the `auto_pods` feature flag is off. */
function useAutoPodsTab(tab: StudioHubTab): StudioHubTab[] {
  return useFeatureFlag('auto_pods') ? [tab] : [];
}

/** Host Studio → Pods: Your Pods, Auto Pods. */
export function HostPodsHub() {
  const { t } = useTranslation();
  const autoPods = useAutoPodsTab({ to: '/host/auto-pods', label: t('shell.nav.autoPods'), render: () => <HostAutoPodsPage /> });
  const tabs: StudioHubTab[] = [
    { to: '/host/pods', label: t('shell.nav.yourPods'), render: () => <HostPodsPage /> },
    ...autoPods,
  ];
  return <StudioHub id="host-pods-hub" label={t('shell.nav.pods')} tabs={tabs} />;
}

/** Host Studio → Requests: Pod Requests, Change Requests. */
export function HostRequestsHub() {
  const { t } = useTranslation();
  const tabs: StudioHubTab[] = [
    { to: '/host/pod-requests', label: t('podRequests.navTitle'), render: () => <PodRequestsPage side="HOST" /> },
    { to: '/host/change-requests', label: t('changeRequest.sectionTitle'), render: () => <ChangeRequestsPage role="HOST" /> },
  ];
  return <StudioHub id="host-requests-hub" label={t('shell.nav.requests')} tabs={tabs} />;
}

/** Venue Studio → Venues: Venue Management, Settings (cancellation policy). */
export function VenuesHub() {
  const { t } = useTranslation();
  const tabs: StudioHubTab[] = [
    { to: '/register-venue', label: t('shell.nav.venueManagement'), render: () => <VenueListingsPage /> },
    { to: '/venues/settings', label: t('shell.nav.settings'), render: () => <VenueSettingsPage /> },
  ];
  return <StudioHub id="venues-hub" label={t('shell.nav.venues')} tabs={tabs} />;
}

/** Venue Studio → Pods: the pods at the venues, and the slot bookings to approve. */
export function VenuePodsHub() {
  const { t } = useTranslation();
  const tabs: StudioHubTab[] = [
    { to: '/venues/pods', label: t('shell.nav.pods'), render: () => <VenuePodsPage /> },
    { to: '/venues/requests', label: t('shell.nav.slotRequests'), render: () => <SlotRequestsPage /> },
  ];
  return <StudioHub id="venue-pods-hub" label={t('shell.nav.pods')} tabs={tabs} />;
}

/** Venue Studio → Requests: Pod Requests, Change Requests, Auto Pods. */
export function VenueRequestsHub() {
  const { t } = useTranslation();
  const autoPods = useAutoPodsTab({ to: '/venues/auto-pods', label: t('shell.nav.autoPods'), render: () => <VenueAutoPodsPage /> });
  const tabs: StudioHubTab[] = [
    { to: '/venues/pod-requests', label: t('podRequests.navTitle'), render: () => <PodRequestsPage side="VENUE" /> },
    { to: '/venues/change-requests', label: t('changeRequest.sectionTitle'), render: () => <ChangeRequestsPage role="VENUE" /> },
    ...autoPods,
  ];
  return <StudioHub id="venue-requests-hub" label={t('shell.nav.requests')} tabs={tabs} />;
}

/** Club Admin Studio → Clubs: Clubs, Auto Pods, Pod Monitoring (AI). */
export function ClubsHub() {
  const { t } = useTranslation();
  const autoPods = useAutoPodsTab({ to: '/club-admin/auto-pods', label: t('shell.nav.autoPods'), render: () => <ClubAdminAutoPodsPage /> });
  const tabs: StudioHubTab[] = [
    { to: '/club-admin/clubs', label: t('shell.nav.clubs'), render: () => <ClubAdminClubsPage /> },
    ...autoPods,
    { to: '/club-admin/monitoring', label: t('shell.nav.podMonitoringAi'), render: () => <ClubAdminPodMonitoringPage /> },
  ];
  return <StudioHub id="clubs-hub" label={t('shell.nav.clubs')} tabs={tabs} />;
}

/** Help: FAQs, Support, Policies. */
export function HelpHub() {
  const { t } = useTranslation();
  const tabs: StudioHubTab[] = [
    { to: '/faqs', label: t('shell.nav.faqs'), render: () => <PartnerFaqsPage /> },
    { to: '/support', label: t('shell.nav.support'), render: () => <SupportPage /> },
    { to: '/policies', label: t('shell.nav.policies'), render: () => <PartnerPoliciesPage /> },
  ];
  return <StudioHub id="help-hub" label={t('shell.nav.help')} tabs={tabs} />;
}
