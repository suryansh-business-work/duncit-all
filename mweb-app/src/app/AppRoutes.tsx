import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import SignupSurveyPage from '../pages/SignupSurveyPage';
import SignupWhatsappPage from '../pages/SignupWhatsappPage';
import AccountPage from '../pages/AccountPage';
import ProfilePage from '../pages/ProfilePage';
import FollowPage from '../pages/FollowPage';
import PublicProfilePage from '../pages/PublicProfilePage';
import PodDetailsPage from '../pages/PodDetailsPage';
import ClubDetailsPage from '../pages/ClubDetailsPage';
import BecomeHostPage from '../pages/BecomeHostPage';
import RegisterVenuePage from '../pages/RegisterVenuePage';
import HostsVenuesPage from '../pages/HostsVenuesPage';
import HostManagePage from '../pages/HostManagePage';
import VenueManagePage from '../pages/VenueManagePage';
import VenueDetailsPage from '../pages/VenueDetailsPage';
import FaqsPage from '../pages/FaqsPage';
import PolicyPage from '../pages/PolicyPage';
import PodIdeasPage from '../pages/PodIdeasPage';
import PodPlansPage from '../pages/PodPlansPage';
import SupportPage from '../pages/SupportPage';
import CheckoutPage from '../pages/CheckoutPage';
import ExplorePage from '../pages/ExplorePage';
import SavedItemsPage from '../pages/SavedItemsPage';
import ClubsPage from '../pages/ClubsPage';
import ChatsPage from '../pages/ChatsPage';
import ChatRoomPage from '../pages/ChatRoomPage';
import { RedirectIfAuthed, RequireAuth } from './AuthGuards';

interface Props {
  superCategory: string;
  locationId: string;
  zoneName: string;
}

const withAuth = (element: JSX.Element) => <RequireAuth>{element}</RequireAuth>;
const redirectIfAuthed = (element: JSX.Element) => <RedirectIfAuthed>{element}</RedirectIfAuthed>;

export default function AppRoutes({ superCategory, locationId, zoneName }: Props) {
  return (
    <Routes>
      <Route
        path="/"
        element={withAuth(
          <HomePage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />
        )}
      />
      <Route path="/profile" element={withAuth(<ProfilePage />)} />
      <Route path="/follow" element={withAuth(<FollowPage superCategorySlug={superCategory} />)} />
      <Route path="/account" element={withAuth(<AccountPage />)} />
      <Route path="/club/:clubSlug" element={withAuth(<ClubDetailsPage />)} />
      <Route path="/venue/:venueId" element={<VenueDetailsPage />} />
      <Route
        path="/club/:clubSlug/pod/:podSlug"
        element={withAuth(<PodDetailsPage />)}
      />
      <Route path="/u/:userId" element={withAuth(<PublicProfilePage />)} />
      <Route path="/become-host" element={withAuth(<BecomeHostPage />)} />
      <Route path="/register-venue" element={withAuth(<RegisterVenuePage />)} />
      <Route path="/hosts-venues" element={withAuth(<HostsVenuesPage />)} />
      <Route path="/host/manage" element={withAuth(<HostManagePage />)} />
      <Route path="/venues/manage" element={withAuth(<VenueManagePage />)} />
      <Route path="/faqs" element={withAuth(<FaqsPage />)} />
      <Route path="/policies/:slug" element={withAuth(<PolicyPage />)} />
      <Route path="/pod-ideas" element={withAuth(<PodIdeasPage />)} />
      <Route path="/pod-plans" element={withAuth(<PodPlansPage />)} />
      <Route path="/support" element={withAuth(<SupportPage />)} />
      <Route path="/signup-survey" element={withAuth(<SignupSurveyPage />)} />
      <Route path="/signup-whatsapp" element={withAuth(<SignupWhatsappPage />)} />
      <Route path="/checkout" element={withAuth(<CheckoutPage />)} />
      <Route path="/checkout/:podId" element={withAuth(<CheckoutPage />)} />
      <Route path="/explore" element={withAuth(<ExplorePage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />)} />
      <Route path="/saved" element={withAuth(<SavedItemsPage />)} />
      <Route path="/clubs" element={withAuth(<ClubsPage superCategorySlug={superCategory} />)} />
      <Route path="/chats" element={withAuth(<ChatsPage superCategorySlug={superCategory} />)} />
      <Route path="/chats/:id" element={withAuth(<ChatRoomPage />)} />
      <Route path="/register" element={redirectIfAuthed(<RegisterPage />)} />
      <Route path="/login" element={redirectIfAuthed(<LoginPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}