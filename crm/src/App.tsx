import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard';
import VenueLeadsPage from './pages/venue-leads/VenueLeadsPage';
import VenueLeadEditorPage from './pages/venue-leads/VenueLeadEditorPage';
import VenueLeadDetailPage from './pages/venue-leads/VenueLeadDetailPage';
import HostLeadsPage from './pages/host-leads/HostLeadsPage';
import HostLeadEditorPage from './pages/host-leads/HostLeadEditorPage';
import HostLeadDetailPage from './pages/host-leads/HostLeadDetailPage';
import ManageServicesPage from './pages/ManageServicesPage';
import ManageDynamicFieldsPage from './pages/ManageDynamicFieldsPage';
import CallPromptsPage from './pages/call-prompts';
import EmailTemplatesPage from './pages/email-templates';
import EmailTemplateEditorPage from './pages/email-templates/EditorPage';
import RemindersPage from './pages/reminders';
import ServicesOfferedPage from './pages/data/services-offered';
import PublicSurveyPage from './pages/public-survey';
import AmenitiesPage from './pages/data/venues/AmenitiesPage';
import EventSuitabilityPage from './pages/data/venues/EventSuitabilityPage';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
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
    <AppShell>
      <ErrorBoundary>{element}</ErrorBoundary>
    </AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public, no-login survey fill page reached via a generated share link. */}
      <Route path="/s/:token" element={<PublicSurveyPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/venue-leads" element={authed(<VenueLeadsPage />)} />
      <Route path="/venue-leads/services" element={authed(<ManageServicesPage kind="VENUE" />)} />
      <Route path="/venue-leads/new" element={authed(<VenueLeadEditorPage />)} />
      <Route path="/venue-leads/:id/view" element={authed(<VenueLeadDetailPage />)} />
      <Route path="/venue-leads/:id" element={authed(<VenueLeadEditorPage />)} />
      <Route path="/host-leads" element={authed(<HostLeadsPage />)} />
      <Route path="/host-leads/services" element={authed(<ManageServicesPage kind="HOST" />)} />
      <Route path="/host-leads/new" element={authed(<HostLeadEditorPage />)} />
      <Route path="/host-leads/:id/view" element={authed(<HostLeadDetailPage />)} />
      <Route path="/host-leads/:id" element={authed(<HostLeadEditorPage />)} />
      <Route path="/call-prompts" element={authed(<CallPromptsPage />)} />
      <Route path="/email-templates" element={authed(<EmailTemplatesPage />)} />
      <Route path="/email-templates/:id" element={authed(<EmailTemplateEditorPage />)} />
      <Route path="/reminders" element={authed(<RemindersPage />)} />
      <Route path="/data/services-offered" element={authed(<ServicesOfferedPage />)} />
      <Route path="/data/venues/amenities" element={authed(<AmenitiesPage />)} />
      <Route path="/data/venues/event-suitability" element={authed(<EventSuitabilityPage />)} />
      <Route path="/settings/dynamic-fields" element={authed(<ManageDynamicFieldsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
