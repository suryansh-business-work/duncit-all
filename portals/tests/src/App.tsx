import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import TestsAppShell from './components/TestsAppShell';
import DashboardPage from './pages/dashboard';
import TestsSettingsPage from './pages/settings';
import { automatedRoutes } from './routes/automated';
import { manualRoutes } from './routes/manual';
import { monitoringRoutes } from './routes/monitoring';
import { runtime } from './runtime';

const { LoginPage, session } = runtime;
const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <TestsAppShell>{el}</TestsAppShell> });

/**
 * The Tests console's screens. Every one sits behind the login gate and its
 * own page error boundary (createAuthed), so one page failing never takes the
 * console down with it. Toasts come from the NotifyHost mountPortal mounts.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/settings" element={authed(<TestsSettingsPage />)} />
      {automatedRoutes(authed)}
      {manualRoutes(authed)}
      {monitoringRoutes(authed)}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
