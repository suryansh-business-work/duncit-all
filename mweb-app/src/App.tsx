import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import { Box, Container } from '@mui/material';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import ProfilePage from './pages/ProfilePage';
import PodDetailsPage from './pages/PodDetailsPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import BecomeHostPage from './pages/BecomeHostPage';
import RegisterVenuePage from './pages/RegisterVenuePage';
import HostsVenuesPage from './pages/HostsVenuesPage';
import FaqsPage from './pages/FaqsPage';
import PolicyPage from './pages/PolicyPage';
import PodIdeasPage from './pages/PodIdeasPage';
import CheckoutPage from './pages/CheckoutPage';
import ExplorePage from './pages/ExplorePage';
import ClubsPage from './pages/ClubsPage';
import ChatsPage from './pages/ChatsPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  const loc = useLocation();
  if (!isAuthed) return <Navigate to="/login" state={{ from: loc }} replace />;
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
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
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
        maxWidth={fullBleed ? false : 'lg'}
        disableGutters={fullBleed}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
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
                <ExplorePage />
              </RequireAuth>
            }
          />
          <Route
            path="/clubs"
            element={
              <RequireAuth>
                <ClubsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chats"
            element={
              <RequireAuth>
                <ChatsPage />
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
    </Box>
  );
}
