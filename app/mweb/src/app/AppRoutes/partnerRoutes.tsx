import { Route } from 'react-router';
import { ChangeRequestsPage, ClubAdminDashboardPage, ClubAutoPodEditorPage, ClubAutoPodsPage, ClubEditPage, ClubMonitoringPage, ClubPodDetailsPage, ClubPodEditorPage, ClubPodsPage, ClubStudioPage, EarnPage, HostAutoPodsPage, NearbyHostsPage, PodRequestsPage, ProductsManagePage, TourGuidePage, VenueAutoPodsPage, VenueAvailabilityPage, VenueEarningsPage, VenueManagePage, VenueSettingsPage, VenueSlotRequestsPage } from './lazyPages';
import { withAuth, withProducts, type AppRoutesProps } from './routeGuards';

/** Earn, venue, club and Auto Pod routes. */
export function partnerRoutes({ locationId }: Readonly<Pick<AppRoutesProps, 'locationId'>>) {
  return (
    <>
        <Route path="/earn" element={withAuth(<EarnPage />)} />
        <Route path="/tour-guide" element={withAuth(<TourGuidePage />)} />
        <Route path="/products/manage" element={withProducts(<ProductsManagePage />)} />
        <Route path="/venues/manage" element={withAuth(<VenueManagePage />)} />
        <Route path="/venues/earnings" element={withAuth(<VenueEarningsPage />)} />
        <Route path="/venues/slot-requests" element={withAuth(<VenueSlotRequestsPage />)} />
        <Route path="/venues/nearby-hosts" element={withAuth(<NearbyHostsPage />)} />
        {/* The studio menu's Requests → Pod Requests, one inbox per side. */}
        <Route path="/venues/pod-requests" element={withAuth(<PodRequestsPage side="VENUE" />)} />
        <Route path="/host/pod-requests" element={withAuth(<PodRequestsPage side="HOST" />)} />
        {/* One route for all three roles: a person can be a venue owner AND a
            host, and it is where the offer email, the WhatsApp CTA and the
            notification all land. */}
        <Route path="/change-requests" element={withAuth(<ChangeRequestsPage />)} />
        <Route path="/venues/availability" element={withAuth(<VenueAvailabilityPage />)} />
        <Route path="/venues/settings" element={withAuth(<VenueSettingsPage />)} />
        {/* Club Studio. `/clubs/manage` and NOT `/club/manage`, which would sit
            under the `/club/:clubSlug` pattern and shadow a real club slug. */}
        <Route path="/clubs/manage" element={withAuth(<ClubStudioPage />)} />
        {/* The Club Admin's own pages — the Partners console's club-admin
            console, on the phone. `/clubs/...` for the same reason. */}
        <Route path="/clubs/dashboard" element={withAuth(<ClubAdminDashboardPage />)} />
        <Route path="/clubs/monitoring" element={withAuth(<ClubMonitoringPage />)} />
        <Route path="/clubs/:clubId/pods" element={withAuth(<ClubPodsPage />)} />
        <Route path="/clubs/:clubId/pods/new" element={withAuth(<ClubPodEditorPage />)} />
        <Route path="/clubs/:clubId/pods/:id/edit" element={withAuth(<ClubPodEditorPage />)} />
        <Route path="/clubs/:clubId/pods/:id" element={withAuth(<ClubPodDetailsPage />)} />
        {/* A Club Admin may open an Auto Pod instead of an ordinary pod — the
            same door the Partners console offers (rule 27). */}
        <Route path="/clubs/:clubId/auto-pods/new" element={withAuth(<ClubAutoPodEditorPage />)} />
        <Route path="/clubs/:clubId/edit" element={withAuth(<ClubEditPage />)} />
        {/* Auto Pods — one queue per enrolment. Reached through the flag-gated
            drawer row, and `/clubs/...` for the same reason Club Studio is. */}
        <Route path="/venues/auto-pods" element={withAuth(<VenueAutoPodsPage locationId={locationId} />)} />
        <Route path="/host/auto-pods" element={withAuth(<HostAutoPodsPage locationId={locationId} />)} />
        <Route path="/clubs/auto-pods" element={withAuth(<ClubAutoPodsPage locationId={locationId} />)} />
    </>
  );
}
