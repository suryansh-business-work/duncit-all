import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import { Box, Container } from '@mui/material';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import SignupSurveyPage from './pages/SignupSurveyPage';
import AccountPage from './pages/AccountPage';
import ProfilePage from './pages/ProfilePage';
import FollowPage from './pages/FollowPage';
import PublicProfilePage from './pages/PublicProfilePage';
import PodDetailsPage from './pages/PodDetailsPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import BecomeHostPage from './pages/BecomeHostPage';
import RegisterVenuePage from './pages/RegisterVenuePage';
import HostsVenuesPage from './pages/HostsVenuesPage';
import HostManagePage from './pages/HostManagePage';
import VenueManagePage from './pages/VenueManagePage';
import FaqsPage from './pages/FaqsPage';
import PolicyPage from './pages/PolicyPage';
import PodIdeasPage from './pages/PodIdeasPage';
import SupportPage from './pages/SupportPage';
import CheckoutPage from './pages/CheckoutPage';
import ExplorePage from './pages/ExplorePage';
import SavedItemsPage from './pages/SavedItemsPage';
import ClubsPage from './pages/ClubsPage';
import ChatsPage from './pages/ChatsPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { NotifyHost } from './components/notify';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  const loc = useLocation();
  if (!isAuthed) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  if (isAuthed) return <Navigate to="/" replace />;
  return children;
}

const RECORD_PING = gql`
  mutation RecordActivePing($slug: String) {
    recordActivePing(super_category_slug: $slug)
  }
`;

export default function App() {
  const isAuthed = !!localStorage.getItem('token');
  const [superCategory, setSuperCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const loc = useLocation();
  const [recordPing] = useMutation(RECORD_PING);

  // Show splash only on first load per browser session.
  const [splashOpen, setSplashOpen] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem('duncit_splash_shown')
  );
  useEffect(() => {
    if (!splashOpen) return;
    const t = window.setTimeout(() => {
      sessionStorage.setItem('duncit_splash_shown', '1');
      setSplashOpen(false);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [splashOpen]);

  // Record an active-user ping (per device + super category) once per page
  // load and whenever the selected super category changes. Server enforces
  // daily uniqueness via {device_id, date_ymd, super_category_slug}.
  useEffect(() => {
    recordPing({ variables: { slug: superCategory || null } }).catch(() => {});
  }, [superCategory, recordPing]);
  // Edge-to-edge full-bleed pages (no Container padding); they manage their
  // own scrolling and need the full available viewport height.
  const fullBleed = loc.pathname.startsWith('/explore');

  // Reserve room for the fixed BottomNav (56px MUI default) + iOS safe-area.
  const BOTTOM_NAV_OFFSET = 'calc(56px + env(safe-area-inset-bottom) + 8px)';

  return (
    <Box sx={isAuthed ? { height: '100dvh', display: 'flex', flexDirection: 'column' } : undefined}>
      {splashOpen && <SplashScreen />}
      {isAuthed && (
        <AppHeader
          selectedSuperCategory={superCategory}
          onSuperCategoryChange={setSuperCategory}
          selectedLocationId={locationId}
          onLocationChange={setLocationId}
          selectedZoneName={zoneName}
          onZoneChange={setZoneName}
        />
      )}
      <Container
        // Wider canvas on desktop while keeping the mobile feel intact.
        maxWidth={fullBleed ? false : 'md'}
        disableGutters={fullBleed}
        sx={{
          ...(isAuthed && {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }),
          py: fullBleed ? 0 : 2,
          // Reserve space for the fixed BottomNav only on padded routes.
          // Full-bleed routes handle their own bottom inset internally.
          pb: fullBleed ? 0 : isAuthed ? BOTTOM_NAV_OFFSET : 2,
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage
                  superCategorySlug={superCategory}
                  locationId={locationId}
                  zoneName={zoneName}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/follow"
            element={
              <RequireAuth>
                <FollowPage />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pods/:id"
            element={
              <RequireAuth>
                <PodDetailsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/u/:userId"
            element={
              <RequireAuth>
                <PublicProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/clubs/:id"
            element={
              <RequireAuth>
                <ClubDetailsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/become-host"
            element={
              <RequireAuth>
                <BecomeHostPage />
              </RequireAuth>
            }
          />
          <Route
            path="/register-venue"
            element={
              <RequireAuth>
                <RegisterVenuePage />
              </RequireAuth>
            }
          />
          <Route
            path="/hosts-venues"
            element={
              <RequireAuth>
                <HostsVenuesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/host/manage"
            element={
              <RequireAuth>
                <HostManagePage />
              </RequireAuth>
            }
          />
          <Route
            path="/venues/manage"
            element={
              <RequireAuth>
                <VenueManagePage />
              </RequireAuth>
            }
          />
          <Route
            path="/faqs"
            element={
              <RequireAuth>
                <FaqsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/policies/:slug"
            element={
              <RequireAuth>
                <PolicyPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pod-ideas"
            element={
              <RequireAuth>
                <PodIdeasPage />
              </RequireAuth>
            }
          />
          <Route
            path="/support"
            element={
              <RequireAuth>
                <SupportPage />
              </RequireAuth>
            }
          />
          <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route
            path="/signup-survey"
            element={
              <RequireAuth>
                <SignupSurveyPage />
              </RequireAuth>
            }
          />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/explore"
            element={
              <RequireAuth>
                <ExplorePage superCategorySlug={superCategory} />
              </RequireAuth>
            }
          />
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <SavedItemsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/clubs"
            element={
              <RequireAuth>
                <ClubsPage superCategorySlug={superCategory} />
              </RequireAuth>
            }
          />
          <Route
            path="/chats"
            element={
              <RequireAuth>
                <ChatsPage superCategorySlug={superCategory} />
              </RequireAuth>
            }
          />
          <Route
            path="/chats/:id"
            element={
              <RequireAuth>
                <ChatRoomPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
      {isAuthed && <BottomNav />}
      <NotifyHost />
    </Box>
  );
}
