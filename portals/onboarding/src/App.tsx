import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HostsPage from './pages/hosts-page/HostsPage';
import VenuesPage from './pages/venues-page/VenuesPage';
import VenueDetailsPage from './pages/venue-details-page/VenueDetailsPage';
import EcommBrandsPage from './pages/ecomm-brands-page/EcommBrandsPage';
import SurveyBuilderPage from './pages/surveys/SurveyBuilderPage';
import SurveysListPage from './pages/surveys/SurveysListPage';
import MeetingCalendarPage from './pages/meetings/MeetingCalendarPage';
import MeetingSchedulePage from './pages/meetings/MeetingSchedulePage';
import MeetingAvailabilityPage from './pages/meetings/MeetingAvailabilityPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: Readonly<{ children: JSX.Element }>) {
  const location = useLocation();
  if (!getToken()) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

const authed = (element: JSX.Element) => (
  <RequireAuth>
    <AppShell>{element}</AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/hosts" element={authed(<HostsPage />)} />
      <Route path="/venues" element={authed(<VenuesPage />)} />
      <Route path="/venues/:venueId" element={authed(<VenueDetailsPage />)} />
      <Route path="/ecomm-brands" element={authed(<EcommBrandsPage />)} />
      <Route path="/surveys" element={authed(<SurveysListPage />)} />
      <Route path="/surveys/new" element={authed(<SurveyBuilderPage />)} />
      <Route path="/surveys/:id/edit" element={authed(<SurveyBuilderPage />)} />
      <Route path="/meetings/calendar" element={authed(<MeetingCalendarPage />)} />
      <Route path="/meetings/availability" element={authed(<MeetingAvailabilityPage />)} />
      <Route path="/meetings/:kind" element={authed(<MeetingSchedulePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
