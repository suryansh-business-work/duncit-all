import { Route } from 'react-router';
import { AccountPage, CityLaunchPage, ClubDetailsPage, CreatePodPage, FollowPage, HomePage, HostApplyPage, HostDashboardPage, HostManagePage, HostPage, HostsVenuesPage, MenuPage, NearbyVenuesPage, PodAttendancePage, PodDetailsPage, PodFeedbackPage, PodMediaPage, PodPendingPage, PodRequestDetailPage, PostPage, ProfilePage, PublicProfilePage, SurveyGatePage, VenueDetailsPage, VenuesPage, VerificationPage, WalletPage } from './lazyPages';
import { PartnerRedirect, withAuth, type AppRoutesProps } from './routeGuards';

/** Home, profile, pod and host routes. Rendered as a fragment so `<Routes>` still sees plain `<Route>` children. */
export function coreRoutes({ superCategory, locationId, zoneName }: Readonly<AppRoutesProps>) {
  return (
    <>
        <Route
          path="/"
          element={withAuth(
            <HomePage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        {/* The account menu is a page, not a drawer — Back/refresh just work. */}
        <Route path="/menu" element={withAuth(<MenuPage />)} />
        <Route path="/profile" element={withAuth(<ProfilePage />)} />
        <Route path="/post/:postId" element={withAuth(<PostPage />)} />
        <Route path="/follow" element={withAuth(<FollowPage superCategorySlug={superCategory} />)} />
        <Route path="/account" element={withAuth(<AccountPage />)} />
        <Route path="/club/:clubSlug" element={withAuth(<ClubDetailsPage />)} />
        <Route path="/venue/:venueId" element={<VenueDetailsPage />} />
        {/* A host's published page — public like the venue page; its pods ask
            a signed-out visitor to sign in, carrying the pod through it. */}
        <Route path="/hosts/:handle" element={<HostPage />} />
        {/* A not-yet-launched city's waitlist — the link its "Send this to your
            friends" hands out. Public: signed out, it asks to sign in there. */}
        <Route path="/city-launch/:locationId" element={<CityLaunchPage />} />
        <Route
          path="/venues"
          element={withAuth(
            <VenuesPage locationId={locationId} superCategorySlug={superCategory} />
          )}
        />
        <Route path="/club/:clubSlug/pod/:podSlug" element={withAuth(<PodDetailsPage />)} />
        {/* The rating link a host shares with their guests. Auth-gated like
            every other page, so an unread link parks in `?redirect` and opens
            straight after sign-in. */}
        <Route path="/pod/:podId/feedback" element={withAuth(<PodFeedbackPage />)} />
        {/* The link a host shares so the people who came can add their photos.
            Signed-in like the rating link: the server answers on who was
            marked present, which it can only do for someone it knows. */}
        <Route path="/pod/:podId/media" element={withAuth(<PodMediaPage />)} />
        <Route path="/u/:handle" element={withAuth(<PublicProfilePage />)} />
        <Route path="/become-host" element={<PartnerRedirect path="/become-host" />} />
        <Route path="/register-venue" element={<PartnerRedirect path="/register-venue" />} />
        <Route path="/survey/:kind" element={withAuth(<SurveyGatePage />)} />
        <Route path="/hosts-venues" element={withAuth(<HostsVenuesPage />)} />
        <Route path="/host/dashboard" element={withAuth(<HostDashboardPage />)} />
        <Route path="/verification" element={withAuth(<VerificationPage />)} />
        <Route path="/host/manage" element={withAuth(<HostManagePage />)} />
        <Route path="/host/nearby-venues" element={withAuth(<NearbyVenuesPage />)} />
        {/* One Pod Request, for either side — where its notifications link. */}
        <Route path="/pod-requests/:id" element={withAuth(<PodRequestDetailPage />)} />
        <Route
          path="/host/pod/:podId/attendance"
          element={withAuth(<PodAttendancePage />)}
        />
        <Route path="/host/apply" element={withAuth(<HostApplyPage />)} />
        <Route path="/host/wallet" element={withAuth(<WalletPage />)} />
        <Route path="/create-pod" element={withAuth(<CreatePodPage />)} />
        <Route path="/create-pod/:draftId" element={withAuth(<CreatePodPage />)} />
        <Route path="/host/pod-pending/:podId" element={withAuth(<PodPendingPage />)} />
    </>
  );
}
