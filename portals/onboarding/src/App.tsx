import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HostsPage from './pages/hosts-page/HostsPage';
import HostDetailsPage from './pages/host-details-page/HostDetailsPage';
import HostRequestsPage from './pages/host-requests/HostRequestsPage';
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
