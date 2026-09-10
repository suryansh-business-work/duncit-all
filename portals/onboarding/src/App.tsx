import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ProfilePage, createAuthed } from '@duncit/shell';
import { useProductVisibility } from '@duncit/app-settings';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HostsPage from './pages/hosts-page/HostsPage';
import HostDetailsPage from './pages/host-details-page/HostDetailsPage';
import HostRequestsPage from './pages/host-requests/HostRequestsPage';
import VenuesPage from './pages/venues-page/VenuesPage';
import VenueDetailsPage from './pages/venue-details-page/VenueDetailsPage';
import EcommBrandsPage from './pages/ecomm-brands-page/EcommBrandsPage';
import ClubAdminsPage from './pages/club-admins-page/ClubAdminsPage';
import SurveyBuilderPage from './pages/surveys/SurveyBuilderPage';
import SurveysHubPage from './pages/surveys/SurveysHubPage';
import SurveysListPage from './pages/surveys/SurveysListPage';
import MeetingCalendarPage from './pages/meetings/MeetingCalendarPage';
import MeetingSchedulePage from './pages/meetings/MeetingSchedulePage';
import MeetingAvailabilityPage from './pages/meetings/MeetingAvailabilityPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

/**
 * Gates the e-commerce brand console on the `is_product_visible` flag: with the
 * feature off the server refuses every brand read, so the route goes home
 * rather than rendering a refusal.
 *
 * It waits on `pending` — the flag set lands a beat after the first paint, and
 * redirecting on that beat would bounce a bookmarked link with the feature on.
 */
function RequireEcomm({ children }: Readonly<{ children: JSX.Element }>) {
  const { pending, visible } = useProductVisibility();
  if (pending) return null;
  if (!visible) return <Navigate to="/" replace />;
  return children;
}

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/host-requests" element={authed(<HostRequestsPage />)} />
      <Route path="/hosts" element={authed(<HostsPage />)} />
      <Route path="/hosts/:hostId" element={authed(<HostDetailsPage />)} />
      <Route path="/venues" element={authed(<VenuesPage />)} />
      <Route path="/venues/:venueId" element={authed(<VenueDetailsPage />)} />
      <Route path="/ecomm-brands" element={authed(<RequireEcomm><EcommBrandsPage /></RequireEcomm>)} />
      <Route path="/club-admins" element={authed(<ClubAdminsPage />)} />
      <Route path="/surveys" element={authed(<SurveysHubPage />)} />
      <Route path="/surveys/kind/:kind" element={authed(<SurveysListPage />)} />
      <Route path="/surveys/new" element={authed(<SurveyBuilderPage />)} />
      <Route path="/surveys/:id/edit" element={authed(<SurveyBuilderPage />)} />
      <Route path="/meetings/calendar" element={authed(<MeetingCalendarPage />)} />
      <Route path="/meetings/availability" element={authed(<MeetingAvailabilityPage />)} />
      <Route path="/meetings/:kind" element={authed(<MeetingSchedulePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
