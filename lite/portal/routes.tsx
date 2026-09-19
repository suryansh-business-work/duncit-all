import { Navigate, Route, Routes } from 'react-router';
import { ConsoleShell } from './layout/ConsoleShell';
import { RequireAdmin } from './layout/RequireAdmin';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { EventsPage } from './pages/events';
import { UsersPage } from './pages/users';
import { RegistrationsPage } from './pages/registrations';
import { CalendarsPage } from './pages/calendars';
import { CategoriesPage } from './pages/categories';
import { CitiesPage } from './pages/cities';
import { EnvironmentPage } from './pages/environment';
import { EmailTemplatesPage } from './pages/email-templates';
import { EmailLogsPage } from './pages/email-logs';
import { LocalizationPage } from './pages/localization';
import { SettingsPage } from './pages/settings';

export function ConsoleRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAdmin />}>
        <Route element={<ConsoleShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/calendars" element={<CalendarsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/cities" element={<CitiesPage />} />
          <Route path="/environment" element={<EnvironmentPage />} />
          <Route path="/email-templates" element={<EmailTemplatesPage />} />
          <Route path="/email-logs" element={<EmailLogsPage />} />
          <Route path="/localization" element={<LocalizationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
