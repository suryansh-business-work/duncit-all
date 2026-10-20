import { Navigate, Route } from 'react-router';
import { BrandOrderDetailPage, BrandOrdersPage, BrandWarehousesPage, ChangeRequestsPage, ClubAdminDashboardPage, ClubAutoPodEditorPage, ClubAutoPodsPage, ClubEditPage, ClubMonitoringPage, ClubPodDetailsPage, ClubPodEditorPage, ClubPodsPage, ClubStudioPage, EarnPage, FreelancerProfilePage, GigDetailPage, GigEditorPage, GigsPage, HostAutoPodsPage, MyGigsPage, HostCategoriesPage, HostPublishPage, HostSharePage, NearbyHostsPage, PodRequestsPage, ProductsManagePage, StudioOptionsPage, TourGuidePage, VenueAutoPodsPage, VenueAvailabilityPage, VenueEarningsPage, VenueFoodPage, VenueRentedItemsPage, VenueListPage, VenueManagePage, VenuePodsPage, VenuePublishPage, VenueSettingsPage, VenueSlotRequestsPage } from './lazyPages';
import { withAuth, withProducts, type AppRoutesProps } from './routeGuards';

/** Earn, venue, club and Auto Pod routes. */
export function partnerRoutes({ locationId }: Readonly<Pick<AppRoutesProps, 'locationId'>>) {
  return (
    <>
        <Route path="/earn" element={withAuth(<EarnPage />)} />
        {/* Earn with Duncit's self-serve freelancer step, and Gig Jobs (sidebar). */}
        <Route path="/earn/freelancer" element={withAuth(<FreelancerProfilePage />)} />
        <Route path="/gigs" element={withAuth(<GigsPage />)} />
        <Route path="/gigs/new" element={withAuth(<GigEditorPage />)} />
        <Route path="/gigs/mine" element={withAuth(<MyGigsPage />)} />
        <Route path="/gigs/:id" element={withAuth(<GigDetailPage />)} />
        <Route path="/gigs/:id/edit" element={withAuth(<GigEditorPage />)} />
        <Route path="/tour-guide" element={withAuth(<TourGuidePage />)} />
        <Route path="/products/manage" element={withProducts(<ProductsManagePage />)} />
        {/* Each studio's Options page — the drawer's one highlighted entry
            opens it. `/clubs/options` for the reason Club Studio is `/clubs`. */}
        <Route path="/venues/options" element={withAuth(<StudioOptionsPage mode="VENUE" />)} />
        <Route path="/host/options" element={withAuth(<StudioOptionsPage mode="HOST" />)} />
        <Route path="/clubs/options" element={withAuth(<StudioOptionsPage mode="CLUB" />)} />
        <Route path="/products/options" element={withProducts(<StudioOptionsPage mode="ECOMM" />)} />
        {/* The brand desk — its Pod Shop orders and ShipRocket warehouses. */}
        <Route path="/products/orders" element={withProducts(<BrandOrdersPage />)} />
        <Route path="/products/orders/:id" element={withProducts(<BrandOrderDetailPage />)} />
        <Route path="/products/warehouses" element={withProducts(<BrandWarehousesPage />)} />
        <Route path="/venues/list" element={withAuth(<VenueListPage />)} />
        <Route path="/venues/publish" element={withAuth(<VenuePublishPage />)} />
        {/* The venue's food desk — the same tools the Partners and Venues consoles mount. */}
        <Route path="/venues/food-dashboard" element={withAuth(<VenueFoodPage tool="food-dashboard" />)} />
        <Route path="/venues/food-menu" element={withAuth(<VenueFoodPage tool="food-menu" />)} />
        <Route path="/venues/food-orders" element={withAuth(<VenueFoodPage tool="food-orders" />)} />
        <Route path="/venues/food-coupons" element={withAuth(<VenueFoodPage tool="food-coupons" />)} />
        <Route path="/venues/rented-items" element={withAuth(<VenueRentedItemsPage />)} />
        <Route path="/venues/pods" element={withAuth(<VenuePodsPage />)} />
        <Route path="/host/publish" element={withAuth(<HostPublishPage />)} />
        <Route path="/host/share" element={withAuth(<HostSharePage />)} />
        <Route path="/host/categories" element={withAuth(<HostCategoriesPage />)} />
        <Route path="/venues/manage" element={withAuth(<VenueManagePage />)} />
        <Route path="/venues/earnings" element={withAuth(<VenueEarningsPage />)} />
        {/* Workshop & Event Requests; /venues/slot-requests is the old path of the same page. */}
        <Route path="/venues/event-requests" element={withAuth(<VenueSlotRequestsPage />)} />
        <Route path="/venues/slot-requests" element={withAuth(<VenueSlotRequestsPage />)} />
        <Route path="/venues/nearby-hosts" element={withAuth(<NearbyHostsPage />)} />
        {/* The studio menu's Requests → Pod Requests, one inbox per side. */}
        <Route path="/venues/pod-requests" element={withAuth(<PodRequestsPage side="VENUE" />)} />
        <Route path="/host/pod-requests" element={withAuth(<PodRequestsPage side="HOST" />)} />
        {/* One route for all three roles: a person can be a venue owner AND a
            host, and it is where the offer email, the WhatsApp CTA and the
            notification all land. */}
        <Route path="/change-requests" element={withAuth(<ChangeRequestsPage />)} />
        {/* The Venue Pricing Module; the old availability calendar URL lands on it. */}
        <Route path="/venues/pricing" element={withAuth(<VenueAvailabilityPage />)} />
        <Route path="/venues/availability" element={<Navigate to="/venues/pricing" replace />} />
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
